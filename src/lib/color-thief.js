class ColorThief {
    getPalette(sourceImage, colorCount = 5) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const width = 50;  // Küçük bir canvas kullanarak performansı artırıyoruz
        const height = 50;
        
        canvas.width = width;
        canvas.height = height;
        context.drawImage(sourceImage, 0, 0, width, height);
        
        const imageData = context.getImageData(0, 0, width, height).data;
        const colors = [];
        
        for (let i = 0; i < imageData.length; i += 4) {
            if (colors.length >= colorCount) break;
            
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            
            // Benzer renkleri filtreleme
            if (!colors.some(color => 
                Math.abs(color[0] - r) < 30 && 
                Math.abs(color[1] - g) < 30 && 
                Math.abs(color[2] - b) < 30
            )) {
                colors.push([r, g, b]);
            }
        }
        
        return colors;
    }
}
