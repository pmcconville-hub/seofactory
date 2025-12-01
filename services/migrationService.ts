import { getSupabaseClient } from './supabaseClient';
import { scrapeForAudit, scrapeUrl } from './firecrawlService';
import { BusinessInfo, SiteInventoryItem } from '../types';

/**
 * Parses a CSV string from a Google Search Console Pages export.
 * @param csvText The raw CSV content as a string.
 * @returns A promise that resolves to an array of page row objects.
 */
const parseGscPagesCsv = (csvText: string): Promise<{ url: string; clicks: number; impressions: number; position: number }[]> => {
    return new Promise((resolve, reject) => {
        if (!csvText) {
            return reject(new Error("CSV text is empty."));
        }

        const lines = csvText.trim().split(/\r?\n/);

        // Find the line that actually contains the headers
        let headerLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            // GSC Pages export uses "Top pages" instead of "Top queries"
            if ((lines[i].includes('Top pages') || lines[i].includes('URL') || lines[i].includes('Page')) && lines[i].includes('Clicks')) {
                headerLineIndex = i;
                break;
            }
        }

        if (headerLineIndex === -1) {
            return reject(new Error("Could not find a valid header row in the CSV file. Ensure it's a standard GSC Pages export."));
        }

        const header = lines[headerLineIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const dataLines = lines.slice(headerLineIndex + 1);

        // Look for either "Top pages" or "Page" or "URL" as the URL column
        let urlIndex = header.indexOf('Top pages');
        if (urlIndex === -1) urlIndex = header.indexOf('Page');
        if (urlIndex === -1) urlIndex = header.indexOf('URL');

        const clicksIndex = header.indexOf('Clicks');
        const impressionsIndex = header.indexOf('Impressions');
        const positionIndex = header.indexOf('Position');

        if (urlIndex === -1 || clicksIndex === -1 || impressionsIndex === -1 || positionIndex === -1) {
            return reject(new Error("CSV header is missing one of the required columns."));
        }

        const data: { url: string; clicks: number; impressions: number; position: number }[] = [];
        for (const line of dataLines) {
            if (!line.trim()) continue;

            const values = line.split(',');
            if (values.length >= header.length) {
                try {
                    data.push({
                        url: values[urlIndex].trim().replace(/^"|"$/g, ''),
                        clicks: parseInt(values[clicksIndex], 10),
                        impressions: parseInt(values[impressionsIndex], 10),
                        position: parseFloat(values[positionIndex]),
                    });
                } catch (e) {
                    console.warn(`Skipping malformed row in GSC Pages CSV: ${line}`);
                }
            }
        }
        resolve(data);
    });
};

const CORS_PROXY_URL = `https://corsproxy.io/?`;

const fetchWithProxy = async (url: string): Promise<Response> => {
    const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    return response;
};

export const fetchAndParseSitemap = async (sitemapUrl: string, onStatusUpdate?: (msg: string) => void): Promise<string[]> => {
    const urls = new Set<string>();
    const processedSitemaps = new Set<string>();
    const queue = [sitemapUrl];

    while (queue.length > 0) {
        const currentUrl = queue.shift()!;
        
        if (processedSitemaps.has(currentUrl)) continue;
        processedSitemaps.add(currentUrl);

        if (onStatusUpdate) onStatusUpdate(`Fetching ${currentUrl}...`);

        try {
            const response = await fetchWithProxy(currentUrl);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const errorNode = xmlDoc.querySelector("parsererror");
            if (errorNode) {
                console.warn(`XML parsing error for ${currentUrl}:`, errorNode.textContent);
                continue;
            }

            const sitemapNodes = xmlDoc.querySelectorAll("sitemap > loc");
            if (sitemapNodes.length > 0) {
                sitemapNodes.forEach((node) => {
                    if (node.textContent) {
                        const childUrl = node.textContent.trim();
                        if (!processedSitemaps.has(childUrl)) {
                            queue.push(childUrl);
                        }
                    }
                });
                if (onStatusUpdate) onStatusUpdate(`Found sitemap index with ${sitemapNodes.length} child sitemaps.`);
            }

            const urlNodes = xmlDoc.querySelectorAll("url > loc");
            urlNodes.forEach((node) => {
                if (node.textContent) {
                    urls.add(node.textContent.trim());
                }
            });

        } catch (e) {
            console.error(`Error processing sitemap ${currentUrl}:`, e);
        }
    }

    return Array.from(urls);
};

export const initializeInventory = async (
    projectId: string, 
    urls: string[], 
    supabaseUrl: string, 
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void
): Promise<void> => {
    if (urls.length === 0) return;

    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const CHUNK_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
        const chunk = urls.slice(i, i + CHUNK_SIZE);
        
        const payload = chunk.map(url => ({
            project_id: projectId,
            url: url,
            status: 'AUDIT_PENDING',
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('site_inventory')
            .upsert(payload as any, { onConflict: 'project_id,url' });

        if (error) {
            console.error("Failed to insert inventory batch:", error);
            throw new Error(`Database error: ${error.message}`);
        }
        
        processed += chunk.length;
        if (onProgress) onProgress(processed, urls.length);
    }
};

export const processGscPages = async (
    projectId: string,
    csvContent: string,
    supabaseUrl: string,
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void
): Promise<void> => {
    const rows = await parseGscPagesCsv(csvContent);
    
    if (rows.length === 0) {
        throw new Error("No valid rows found in GSC Pages CSV.");
    }

    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const CHUNK_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        
        const updates = chunk.map(row => ({
            project_id: projectId,
            url: row.url,
            gsc_clicks: row.clicks,
            gsc_impressions: row.impressions,
            gsc_position: row.position,
            updated_at: new Date().toISOString(),
            index_status: row.impressions > 0 ? 'INDEXED' : undefined
        }));

        const { error } = await supabase
            .from('site_inventory')
            .upsert(updates as any, { onConflict: 'project_id,url' });

        if (error) {
            console.error("Failed to update GSC data:", error);
            throw new Error(`Database update failed: ${error.message}`);
        }

        processed += chunk.length;
        if (onProgress) onProgress(processed, rows.length);
    }
};

export const calculateCoR = (metrics: { domSizeKb: number, wordCount: number, linkCount: number, codeRatio: number }): number => {
    let score = 0;
    if (metrics.domSizeKb > 500) score += 40;
    else if (metrics.domSizeKb > 100) score += 20;
    if (metrics.linkCount > 200) score += 30;
    else if (metrics.linkCount > 100) score += 15;
    if (metrics.codeRatio < 0.1) score += 30; 
    else if (metrics.codeRatio < 0.2) score += 10;
    return Math.min(100, score);
};

export const runTechnicalCrawl = async (
    projectId: string,
    urls: string[],
    businessInfo: BusinessInfo,
    supabaseUrl: string,
    supabaseAnonKey: string,
    onProgress?: (count: number, total: number) => void
): Promise<void> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    let processed = 0;

    for (const url of urls) {
        try {
            const apiKey = businessInfo.firecrawlApiKey || '';
            const auditResult = await scrapeForAudit(url, apiKey);

            const domSizeKb = auditResult.markdown.length / 1024;
            const wordCount = auditResult.wordCount;
            const linkCount = auditResult.internalLinkCount + auditResult.externalLinkCount;
            const codeRatio = 0.3; // Firecrawl doesn't give us HTML size, use default

            const corScore = calculateCoR({ domSizeKb, wordCount, linkCount, codeRatio });

            await supabase
                .from('site_inventory')
                .update({
                    dom_size: Math.round(domSizeKb),
                    word_count: wordCount,
                    link_count: linkCount,
                    cor_score: corScore,
                    status: 'GAP_ANALYSIS', 
                    updated_at: new Date().toISOString()
                })
                .eq('project_id', projectId)
                .eq('url', url);

        } catch (e) {
            console.warn(`Failed to audit ${url}:`, e);
        }
        
        processed++;
        if (onProgress) onProgress(processed, urls.length);
    }
};

/**
 * Retrieves the original content for an inventory item.
 * If a snapshot exists, returns it.
 * If not, scrapes the URL, saves the snapshot, and returns it.
 */
export const getOriginalContent = async (
    inventoryItem: SiteInventoryItem, 
    businessInfo: BusinessInfo,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<string> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    // 1. Check DB for existing snapshot
    const { data: existing } = await supabase
        .from('transition_snapshots')
        .select('content_markdown')
        .eq('inventory_id', inventoryItem.id)
        .eq('snapshot_type', 'ORIGINAL_IMPORT')
        .single();
        
    if (existing) return existing.content_markdown || '';

    // 2. Scrape live
    const apiKey = businessInfo.firecrawlApiKey || '';
    const { markdown } = await scrapeUrl(inventoryItem.url, apiKey);
    
    // 3. Save snapshot
    await supabase.from('transition_snapshots').insert({
        inventory_id: inventoryItem.id,
        content_markdown: markdown,
        snapshot_type: 'ORIGINAL_IMPORT',
        created_at: new Date().toISOString()
    });
    
    return markdown;
};