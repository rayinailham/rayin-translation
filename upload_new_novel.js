
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ykceernevnnsbncuhygl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Vlcm5ldm5uc2JuY3VoeWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQ1MTIsImV4cCI6MjA4NjE0MDUxMn0.QmZIlyBXWSz0m6Pg61xBFEKyTVE3dQxWCRj3fTVujGw';
const supabase = createClient(supabaseUrl, supabaseKey);

const novelId = '30f6d294-ce5a-49f9-be3b-4691a84de17b';
const bucketName = 'covers';

async function uploadFile(filePath, fileName) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return null;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
            contentType: 'image/webp',
            upsert: true
        });
    
    if (error) {
        console.error(`Error uploading ${fileName}:`, error.message);
        return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
        
    return publicUrl;
}

async function run() {
    const landscapePath = 'd:/Story/Translate/【書籍化】路地裏で拾った女の子がバッドエンド後の乙女ゲームのヒロインだった件【コミカライズ】/[Cover Landscape] The Girl I Picked Up in the Back Alley Turned Out to Be the Heroine of a Bad Ending Otome.webp';
    const portraitPath = 'd:/Story/Translate/【書籍化】路地裏で拾った女の子がバッドエンド後の乙女ゲームのヒロインだった件【コミカライズ】/[Cover Potrait] The Girl I Picked Up in the Back Alley Turned Out to Be the Heroine of a Bad Ending Otome.webp';
    
    console.log('Uploading images for "The Girl I Picked Up"...');
    
    // Using sanitized filenames for the bucket
    const landscapeUrl = await uploadFile(landscapePath, 'the-girl-i-picked-up-landscape.webp');
    const portraitUrl = await uploadFile(portraitPath, 'the-girl-i-picked-up-portrait.webp');
    
    if (portraitUrl && landscapeUrl) {
        console.log('Upload successful!');
        console.log('Portrait:', portraitUrl);
        console.log('Landscape:', landscapeUrl);
        
        console.log('Updating database...');
        const { error: updateError } = await supabase
            .from('novels')
            .update({ 
                image_url: portraitUrl,
                banner_url: landscapeUrl
            })
            .eq('id', novelId);
            
        if (updateError) {
            console.error('Error updating database:', updateError.message);
        } else {
            console.log('Database updated successfully!');
        }
    } else {
        console.error('Upload failed, cannot update database.');
    }
}

run();
