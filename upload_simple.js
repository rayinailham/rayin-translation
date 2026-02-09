
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ykceernevnnsbncuhygl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Vlcm5ldm5uc2JuY3VoeWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQ1MTIsImV4cCI6MjA4NjE0MDUxMn0.QmZIlyBXWSz0m6Pg61xBFEKyTVE3dQxWCRj3fTVujGw';
const supabase = createClient(supabaseUrl, supabaseKey);

const novelId = '78bf43f2-4b78-4899-bb10-3d2d930c25ee';
const bucketName = 'covers';

async function uploadFile(filePath, fileName) {
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
    const portraitPath = 'd:/Story/Translate/また会えたら結婚しよう、と約束した元カノに一週間でバッタリ再会しちゃった件/[Cover Portrait] I Promised My Ex-Girlfriend We’d Get Married If We Ever Met Again, Then I Ran Into Her a Week Later.webp';
    const landscapePath = 'd:/Story/Translate/また会えたら結婚しよう、と約束した元カノに一週間でバッタリ再会しちゃった件/[Cover Landscape] I Promised My Ex-Girlfriend We’d Get Married If We Ever Met Again, Then I Ran Into Her a Week Later.webp';
    
    console.log('Uploading images...');
    
    const portraitUrl = await uploadFile(portraitPath, 'ex-girlfriend-portrait.webp');
    const landscapeUrl = await uploadFile(landscapePath, 'ex-girlfriend-landscape.webp');
    
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
    }
}

run();
