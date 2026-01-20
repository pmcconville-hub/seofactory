/**
 * setupGeneratedImagesBucket.ts
 *
 * Creates the Supabase Storage bucket for generated/uploaded images.
 * This provides persistent image storage when Cloudinary is not configured.
 *
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/setupGeneratedImagesBucket.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('You can find this in Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('Setting up generated-images bucket...\n');

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === 'generated-images');

  if (bucketExists) {
    console.log('✅ Bucket "generated-images" already exists');

    // Update bucket settings to ensure it's public
    const { error: updateError } = await supabase.storage.updateBucket('generated-images', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });

    if (updateError) {
      console.warn('Warning: Could not update bucket settings:', updateError.message);
    } else {
      console.log('✅ Updated bucket settings (public: true, 10MB limit)');
    }
  } else {
    // Create bucket
    const { error: createError } = await supabase.storage.createBucket('generated-images', {
      public: true, // Public bucket so images can be viewed without auth
      fileSizeLimit: 10485760, // 10MB for generated images
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('Failed to create bucket:', createError.message);
      process.exit(1);
    }

    console.log('✅ Created bucket "generated-images"');
  }

  console.log('\n✅ Setup complete!');
  console.log('\nGenerated images will now be persisted to Supabase Storage.');
  console.log('Images will be accessible at: ' + SUPABASE_URL + '/storage/v1/object/public/generated-images/...');
}

main().catch(console.error);
