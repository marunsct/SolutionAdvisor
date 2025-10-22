sap.ui.define([], function() {
    "use strict";

    /**
     * FlowchartGenerator - Generate SVG flowcharts from decision paths
     */
    return {
        /**
         * Generate SVG flowchart from decision path data
         * @param {Object} analysisData - Analysis data including decision paths
         * @param {string} containerId - DOM element ID where SVG will be inserted
         * @returns {Object} SVG element and metadata
         */
        generateFlowchart: function(analysisData, containerId) {
            const decisionPaths = analysisData.decisionPaths || [];
            const finalRecommendation = analysisData.finalRecommendation || "Unknown";
            
            // Configuration
            const nodeWidth = 200;
            const nodeHeight = 80;
            const horizontalSpacing = 100;
            const verticalSpacing = 120;
            const startX = 100;
            const startY = 50;
            
            // Calculate SVG dimensions
            const totalWidth = startX + (decisionPaths.length * (nodeWidth + horizontalSpacing)) + startX;
            const totalHeight = startY + nodeHeight + verticalSpacing + nodeHeight + 50;
            
            // Create SVG
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", totalWidth);
            svg.setAttribute("height", totalHeight);
            svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
            svg.style.backgroundColor = "#fafafa";
            
            // Add definitions for arrow markers
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
            marker.setAttribute("id", "arrowhead");
            marker.setAttribute("markerWidth", "10");
            marker.setAttribute("markerHeight", "10");
            marker.setAttribute("refX", "9");
            marker.setAttribute("refY", "3");
            marker.setAttribute("orient", "auto");
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polygon.setAttribute("points", "0 0, 10 3, 0 6");
            polygon.setAttribute("fill", "#333");
            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);
            
            // Draw decision nodes
            let prevX = startX;
            let prevY = startY + nodeHeight / 2;
            
            decisionPaths.forEach((path, index) => {
                const x = startX + (index * (nodeWidth + horizontalSpacing));
                const y = startY;
                
                // Draw connection line from previous node
                if (index > 0) {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", prevX);
                    line.setAttribute("y1", prevY);
                    line.setAttribute("x2", x);
                    line.setAttribute("y2", y + nodeHeight / 2);
                    line.setAttribute("stroke", "#333");
                    line.setAttribute("stroke-width", "2");
                    line.setAttribute("marker-end", "url(#arrowhead)");
                    svg.appendChild(line);
                }
                
                // Draw node rectangle
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", x);
                rect.setAttribute("y", y);
                rect.setAttribute("width", nodeWidth);
                rect.setAttribute("height", nodeHeight);
                rect.setAttribute("fill", "#fff");
                rect.setAttribute("stroke", "#757575");
                rect.setAttribute("stroke-width", "2");
                rect.setAttribute("rx", "5");
                svg.appendChild(rect);
                
                // Add question text
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", x + nodeWidth / 2);
                text.setAttribute("y", y + 25);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("font-size", "12");
                text.setAttribute("font-weight", "bold");
                text.textContent = `Q${path.stepOrder}: ${this._truncateText(path.questionText, 25)}`;
                svg.appendChild(text);
                
                // Add answer text
                const answerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                answerText.setAttribute("x", x + nodeWidth / 2);
                answerText.setAttribute("y", y + 50);
                answerText.setAttribute("text-anchor", "middle");
                answerText.setAttribute("font-size", "11");
                answerText.setAttribute("fill", "#666");
                answerText.textContent = this._truncateText(path.selectedAnswer, 30);
                svg.appendChild(answerText);
                
                prevX = x + nodeWidth;
                prevY = y + nodeHeight / 2;
            });
            
            // Draw final recommendation node
            const finalX = startX + (decisionPaths.length * (nodeWidth + horizontalSpacing));
            const finalY = startY;
            
            // Connection to final node
            if (decisionPaths.length > 0) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", prevX);
                line.setAttribute("y1", prevY);
                line.setAttribute("x2", finalX);
                line.setAttribute("y2", finalY + nodeHeight / 2);
                line.setAttribute("stroke", "#333");
                line.setAttribute("stroke-width", "2");
                line.setAttribute("marker-end", "url(#arrowhead)");
                svg.appendChild(line);
            }
            
            // Final recommendation node
            const finalColor = this._getLevelColor(finalRecommendation);
            const finalRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            finalRect.setAttribute("x", finalX);
            finalRect.setAttribute("y", finalY);
            finalRect.setAttribute("width", nodeWidth);
            finalRect.setAttribute("height", nodeHeight);
            finalRect.setAttribute("fill", finalColor.bg);
            finalRect.setAttribute("stroke", finalColor.border);
            finalRect.setAttribute("stroke-width", "3");
            finalRect.setAttribute("rx", "5");
            svg.appendChild(finalRect);
            
            const finalText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            finalText.setAttribute("x", finalX + nodeWidth / 2);
            finalText.setAttribute("y", finalY + 35);
            finalText.setAttribute("text-anchor", "middle");
            finalText.setAttribute("font-size", "14");
            finalText.setAttribute("font-weight", "bold");
            finalText.textContent = "Final Recommendation";
            svg.appendChild(finalText);
            
            const levelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            levelText.setAttribute("x", finalX + nodeWidth / 2);
            levelText.setAttribute("y", finalY + 55);
            levelText.setAttribute("text-anchor", "middle");
            levelText.setAttribute("font-size", "16");
            levelText.setAttribute("font-weight", "bold");
            levelText.setAttribute("fill", finalColor.border);
            levelText.textContent = finalRecommendation;
            svg.appendChild(levelText);
            
            // Insert into container
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = "";
                container.appendChild(svg);
            }
            
            return {
                svg: svg,
                width: totalWidth,
                height: totalHeight
            };
        },
        
        /**
         * Truncate text to specified length
         */
        _truncateText: function(text, maxLength) {
            if (!text) return "";
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength - 3) + "...";
        },
        
        /**
         * Get color scheme for clean core level
         */
        _getLevelColor: function(level) {
            const colors = {
                "Level A": { bg: "#e8f5e9", border: "#4caf50" },
                "Level B": { bg: "#e3f2fd", border: "#2196f3" },
                "Level C": { bg: "#fff3e0", border: "#ff9800" },
                "Level D": { bg: "#ffebee", border: "#f44336" }
            };
            return colors[level] || { bg: "#f5f5f5", border: "#9e9e9e" };
        },
        
        /**
         * Export SVG as PNG
         */
        exportAsPNG: function(svgElement, filename) {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename || "flowchart.png";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            };
            
            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
        },
        
        /**
         * Export SVG as PDF (simplified version - would need proper PDF library in production)
         */
        exportAsPDF: function(svgElement, filename) {
            // This is a placeholder - in production, use jsPDF or similar library
            // For now, we'll just export as SVG file
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const blob = new Blob([svgString], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (filename || "flowchart") + ".svg";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
});
