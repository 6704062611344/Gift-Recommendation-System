const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();

// Helper to determine a good icon based on SVG path or nearby text
function guessIcon(svgContent, fileContent, matchIndex) {
    const textAround = fileContent.substring(Math.max(0, matchIndex - 100), Math.min(fileContent.length, matchIndex + 200)).toLowerCase();
    
    if (textAround.includes('dashboard') || textAround.includes('home')) return 'icon/home (1).png';
    if (textAround.includes('recipient') || textAround.includes('user') || textAround.includes('group')) return 'icon/group (1).png';
    if (textAround.includes('favorite') || textAround.includes('star')) return 'icon/star (1).png';
    if (textAround.includes('gift') || textAround.includes('package')) return 'icon/package (1).png';
    if (textAround.includes('category') || textAround.includes('categories')) return 'icon/categories.png';
    if (textAround.includes('rule') || textAround.includes('setting')) return 'icon/setting (1).png';
    if (textAround.includes('vocab')) return 'icon/book.png';
    if (textAround.includes('admin') || textAround.includes('logout') || textAround.includes('enter')) return 'icon/enter (1).png';
    if (textAround.includes('delete') || textAround.includes('trash')) return 'icon/delete.png';
    if (textAround.includes('edit') || textAround.includes('pencil')) return 'icon/edit.png';
    if (textAround.includes('arrow') || textAround.includes('view all') || textAround.includes('browse') || textAround.includes('details')) return 'icon/right-arrow.png';
    
    return 'icon/surprise (1).png'; // default
}

function replaceSvgsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    const svgRegex = /<svg([^>]*)>([\s\S]*?)<\/svg>/gi;
    
    content = content.replace(svgRegex, (match, svgAttr, innerSvg, index) => {
        // extract width and height
        const widthMatch = svgAttr.match(/width=["']([^"']+)["']/i);
        const heightMatch = svgAttr.match(/height=["']([^"']+)["']/i);
        
        const width = widthMatch ? widthMatch[1] : '18';
        const height = heightMatch ? heightMatch[1] : '18';
        
        let widthPx = width.includes('px') || width.includes('%') || width.includes('em') ? width : `${width}px`;
        let heightPx = height.includes('px') || height.includes('%') || height.includes('em') ? height : `${height}px`;

        const iconPath = guessIcon(match, originalContent, index);
        
        return `<img src="${iconPath}" style="width:${widthPx};height:${heightPx};object-fit:contain;" alt="icon">`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${path.basename(filePath)}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'icon') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.html')) {
            replaceSvgsInFile(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log("Done replacing SVGs.");
