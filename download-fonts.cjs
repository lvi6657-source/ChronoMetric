const fs = require('fs');
const path = require('path');
const http = require('https');

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@400;600&family=Rubik:wght@400;500;700&family=Roboto+Mono:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&family=Chakra+Petch:wght@400;500;700&family=Orbitron:wght@400;700&family=Quantico:wght@400;700&family=Electrolize&family=Rajdhani:wght@500;600;700&family=Michroma&family=Bruno+Ace&family=Audiowide&family=Tektur:wght@400;500;600;700&family=Wallpoet&family=Syncopate:wght@400;700&family=Syne+Mono&family=Exo+2:wght@400;600;700&family=Saira+Stencil+One&family=Turret+Road:wght@400;500;700&family=Oxanium:wght@400;600;700&display=swap';

const PUBLIC_FONTS_DIR = path.join(__dirname, 'public', 'fonts');

// Ensure directory tree exists
fs.mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });

function apiRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...headers
            }
        };

        http.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        http.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function main() {
    console.log('Fetching Google Fonts CSS...');
    const originalCss = await apiRequest(FONTS_URL);
    
    // Parse Google CSS
    const fontFaces = [];
    const blocks = originalCss.split('}');
    
    let localCss = '';
    let counter = 0;

    for (const block of blocks) {
        if (!block.trim()) continue;
        const fontFaceStr = block + '}';
        
        const familyMatch = fontFaceStr.match(/font-family:\s*'([^']+)'/);
        const styleMatch = fontFaceStr.match(/font-style:\s*([a-z]+)/);
        const weightMatch = fontFaceStr.match(/font-weight:\s*([0-9a-z]+)/);
        const urlMatch = fontFaceStr.match(/url\((https:\/\/[^)]+)\)/);

        if (familyMatch && urlMatch) {
            counter++;
            const family = familyMatch[1];
            const style = styleMatch ? styleMatch[1] : 'normal';
            const weight = weightMatch ? weightMatch[1] : '400';
            const remoteUrl = urlMatch[1];
            
            const cleanFamilyName = family.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const fileName = `${cleanFamilyName}-${weight}-${style}.woff2`;
            const localFilePath = path.join(PUBLIC_FONTS_DIR, fileName);

            console.log(`Downloading [${counter}] ${family} (${weight}, ${style})...`);
            try {
                await downloadFile(remoteUrl, localFilePath);
                
                let localBlock = fontFaceStr;
                localBlock = localBlock.replace(/url\([^)]+\)/g, `url('./${fileName}')`);
                
                localCss += localBlock + '\n';
            } catch (err) {
                console.error(`Failed to download ${family}:`, err.message);
                localCss += fontFaceStr + '\n';
            }
        } else {
            localCss += fontFaceStr + '\n';
        }
    }

    const cssOutputPath = path.join(PUBLIC_FONTS_DIR, 'fonts.css');
    fs.writeFileSync(cssOutputPath, localCss);
    console.log(`Successfully generated local fonts CSS at ${cssOutputPath}`);
    console.log('All processed. Total fonts:', counter);
}

main().catch(console.error);
