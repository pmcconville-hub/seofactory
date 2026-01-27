/**
 * Test for enhanced heuristics component selection
 * Run with: npx vitest run services/publishing/architect/__tests__/enhancedHeuristics.test.ts
 */
import { describe, it, expect } from 'vitest';
import { generateBlueprintHeuristicV2 } from '../architectService';

describe('Enhanced Heuristics Component Selection', () => {
  const testArticleContent = `
# VVE Beheer - Professioneel Beheer voor uw Vereniging

VVE beheer is essentieel voor het onderhoud en beheer van uw appartementencomplex. Een professionele VVE beheerder zorgt voor technisch beheer, administratief beheer en financieel beheer. Dit zorgt voor een zorgeloze woonomgeving.

## Wat Bieden Wij

Wij bieden complete VVE beheer diensten:

- Volledig administratief beheer van uw VVE
- Financiële administratie en jaarrekeningen
- Technisch onderhoud en inspectie
- Begeleiding vergaderingen en besluitvorming
- 24/7 storingsmeldpunt

## Drie Pijlers van Ons VVE Beheer

### Administratief Beheer
Volledige administratieve ondersteuning inclusief ledenadministratie, correspondentie en archivering.

### Financieel Beheer
Professionele financiële administratie met maandelijkse rapportages, begroting en jaarrekening.

### Technisch Beheer
Technische inspecties, onderhoudsplannen en coördinatie van reparaties en renovaties.

## Onze Werkwijze

Stap 1: Intake gesprek en inventarisatie van uw VVE
Stap 2: Opstellen beheersovereenkomst op maat
Stap 3: Overdracht en implementatie van het beheer
Stap 4: Lopend beheer en kwartaalrapportage

## Voordelen van Professioneel VVE Beheer

- **Ontzorging** - U hoeft zich nergens zorgen over te maken
- **Expertise** - Jarenlange ervaring in VVE beheer
- **Transparantie** - Altijd inzicht in financiën en werkzaamheden
- **Bereikbaarheid** - Altijd een aanspreekpunt beschikbaar

## Veelgestelde Vragen

Wat kost VVE beheer per maand?
De kosten variëren afhankelijk van de grootte van de VVE en de gewenste diensten.

Hoe lang duurt de overdracht van het beheer?
Een overdracht duurt gemiddeld 4-6 weken na ondertekening van de overeenkomst.

Kunnen we tussentijds opzeggen?
Ja, met inachtneming van de opzegtermijn zoals vermeld in de beheersovereenkomst.
`;

  const mockBusinessInfo = {
    companyName: 'Test VVE Beheer',
    industry: 'real-estate',
    targetAudience: 'VVE besturen',
    brandVoice: 'professional',
    primaryGoal: 'inform',
    uniqueSellingPoints: ['expertise', 'service'],
  } as any;

  it('should generate a blueprint with visual components, not all prose', () => {
    const blueprint = generateBlueprintHeuristicV2(
      testArticleContent,
      'VVE Beheer',
      'test-article-1',
      mockBusinessInfo,
      {}
    );

    // Log the results for debugging
    console.log('\n=== BLUEPRINT COMPONENT SELECTION ===');
    console.log('Total sections:', blueprint.sections.length);

    const componentCounts: Record<string, number> = {};
    for (const section of blueprint.sections) {
      const comp = section.presentation.component;
      componentCounts[comp] = (componentCounts[comp] || 0) + 1;
      console.log(`  [${section.id}] ${comp.padEnd(20)} - "${section.heading || '(intro)'}"`);
    }

    console.log('\nComponent Distribution:');
    for (const [comp, count] of Object.entries(componentCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${comp.padEnd(20)} ${count}`);
    }

    // Assertions
    const proseCount = componentCounts['prose'] || 0;
    const totalSections = blueprint.sections.length;
    const nonProseSections = totalSections - proseCount - (componentCounts['lead-paragraph'] || 0);

    // We expect at least some visual components (not all prose)
    expect(nonProseSections).toBeGreaterThan(0);
    console.log(`\nVisual components: ${nonProseSections} out of ${totalSections} sections`);

    // Specific component expectations based on content patterns:
    // "Drie Pijlers" should trigger card-grid
    const hasCardGrid = componentCounts['card-grid'] || 0;
    expect(hasCardGrid).toBeGreaterThanOrEqual(1);

    // "Onze Werkwijze" should trigger timeline
    const hasTimeline = Object.keys(componentCounts).some(k => k.includes('timeline'));
    expect(hasTimeline).toBe(true);

    // "Voordelen" should trigger feature-list or card-grid
    const hasFeatureOrCard = (componentCounts['feature-list'] || 0) + (componentCounts['card-grid'] || 0);
    expect(hasFeatureOrCard).toBeGreaterThanOrEqual(1);

    // "Veelgestelde Vragen" should trigger faq-accordion
    const hasFaq = Object.keys(componentCounts).some(k => k.includes('faq'));
    expect(hasFaq).toBe(true);

    console.log('\n✅ All component selection tests passed!');
  });

  it('should include key-takeaways hero section', () => {
    const blueprint = generateBlueprintHeuristicV2(
      testArticleContent,
      'VVE Beheer',
      'test-article-2',
      mockBusinessInfo,
      {}
    );

    const hasKeyTakeaways = blueprint.sections.some(
      s => s.presentation.component === 'key-takeaways'
    );

    console.log('\nKey Takeaways section:', hasKeyTakeaways ? 'Present ✅' : 'Missing ❌');
    expect(hasKeyTakeaways).toBe(true);
  });
});
