sap.ui.define([], function() {
    "use strict";

    /**
     * FlowchartGenerator - Generate SVG flowcharts from decision paths using D3.js
     */
    return {
        /**
         * Generate D3.js hierarchical tree flowchart
         * @param {Object} analysisData - Analysis data including decision paths
         * @param {string} containerId - DOM element ID where SVG will be inserted
         * @returns {Promise} Promise that resolves when flowchart is generated
         */
        generateFlowchart: function(analysisData, containerId) {
            // Check if D3 is available with all required features (tree, zoom, hierarchy)
            if (typeof d3 !== 'undefined' && d3.zoom && d3.tree && d3.hierarchy) {
                return this._generateD3Flowchart(analysisData, containerId);
            } else {
                // Fallback to basic SVG (D3 not available or incomplete)
                return this._generateBasicFlowchart(analysisData, containerId);
            }
        },

        /**
         * Generate D3.js flowchart with zoom and interaction
         */
        _generateD3Flowchart: function(analysisData, containerId) {
            return new Promise((resolve, reject) => {
                try {
                    const decisionPaths = analysisData.decisionPaths || [];
                    const finalRecommendation = analysisData.finalRecommendation || "Unknown";
                    
                    // Configuration
                    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
                    const width = 1400 - margin.left - margin.right;
                    const height = 600 - margin.top - margin.bottom;
                    
                    // Clear existing content
                    const container = document.getElementById(containerId);
                    if (!container) {
                        reject(new Error("Container not found"));
                        return;
                    }
                    container.innerHTML = "";
                    
                    // Create SVG with D3
                    const svg = d3.select(`#${containerId}`)
                        .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);
                    
                    const g = svg.append("g")
                        .attr("transform", `translate(${margin.left},${margin.top})`);
                    
                    // Add zoom behavior
                    const zoom = d3.zoom()
                        .scaleExtent([0.3, 3])
                        .on("zoom", (event) => {
                            g.attr("transform", event.transform);
                        });
                    
                    svg.call(zoom);
                    
                    // Transform decision paths to tree data
                    const treeData = this._transformToHierarchy(decisionPaths, finalRecommendation);
                    
                    // Create tree layout
                    const treemap = d3.tree().size([height, width]);
                    
                    // Assign nodes and links
                    const root = d3.hierarchy(treeData);
                    root.x0 = height / 2;
                    root.y0 = 0;
                    
                    const treeNodes = treemap(root);
                    
                    // Add arrow marker
                    svg.append("defs").append("marker")
                        .attr("id", "arrowhead")
                        .attr("markerWidth", 10)
                        .attr("markerHeight", 10)
                        .attr("refX", 9)
                        .attr("refY", 3)
                        .attr("orient", "auto")
                        .append("polygon")
                        .attr("points", "0 0, 10 3, 0 6")
                        .attr("fill", "#999");
                    
                    // Draw links (connections)
                    g.selectAll(".link")
                        .data(treeNodes.links())
                        .enter()
                        .append("path")
                        .attr("class", "link")
                        .attr("fill", "none")
                        .attr("stroke", "#999")
                        .attr("stroke-width", 2)
                        .attr("marker-end", "url(#arrowhead)")
                        .attr("d", d3.linkHorizontal()
                            .x(d => d.y)
                            .y(d => d.x)
                        );
                    
                    // Draw nodes
                    const node = g.selectAll(".node")
                        .data(treeNodes.descendants())
                        .enter()
                        .append("g")
                        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
                        .attr("transform", d => `translate(${d.y},${d.x})`);
                    
                    // Add rectangles for nodes
                    node.append("rect")
                        .attr("width", 180)
                        .attr("height", 70)
                        .attr("x", -90)
                        .attr("y", -35)
                        .attr("rx", 5)
                        .attr("ry", 5)
                        .style("fill", d => this._getNodeColor(d.data))
                        .style("stroke", d => this._getNodeBorderColor(d.data))
                        .style("stroke-width", 2)
                        .style("cursor", "pointer")
                        .on("click", (event, d) => {
                            this._onNodeClick(event, d);
                        });
                    
                    // Add question text
                    node.append("text")
                        .attr("dy", -10)
                        .attr("x", 0)
                        .attr("text-anchor", "middle")
                        .style("font-size", "11px")
                        .style("font-weight", "bold")
                        .text(d => d.data.question ? this._truncateText(d.data.question, 25) : "");
                    
                    // Add answer text
                    node.append("text")
                        .attr("dy", 10)
                        .attr("x", 0)
                        .attr("text-anchor", "middle")
                        .style("font-size", "10px")
                        .style("fill", "#666")
                        .text(d => d.data.answer ? this._truncateText(d.data.answer, 30) : "");
                    
                    // Add step number badge
                    node.filter(d => d.data.step)
                        .append("circle")
                        .attr("cx", -80)
                        .attr("cy", -28)
                        .attr("r", 12)
                        .style("fill", "#0078D4");
                    
                    node.filter(d => d.data.step)
                        .append("text")
                        .attr("x", -80)
                        .attr("y", -23)
                        .attr("text-anchor", "middle")
                        .style("fill", "white")
                        .style("font-size", "10px")
                        .style("font-weight", "bold")
                        .text(d => d.data.step);
                    
                    resolve(svg.node());
                } catch (error) {
                    console.error("Error generating D3 flowchart:", error);
                    reject(error);
                }
            });
        },

        /**
         * Basic SVG flowchart (fallback when D3 is not available)
         */
        _generateBasicFlowchart: function(analysisData, containerId) {
            return new Promise((resolve) => {
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
                
                // Resolve promise with basic flowchart info
                resolve({
                    svg: svg,
                    width: totalWidth,
                    height: totalHeight
                });
            });
        },
        
        /**
         * Transform decision paths to hierarchical tree structure
         */
        _transformToHierarchy: function(decisionPaths, finalRecommendation) {
            // Sort paths by step order
            const sortedPaths = decisionPaths.sort((a, b) => a.stepOrder - b.stepOrder);
            
            // Build tree structure
            const root = {
                name: "Start",
                question: "Analysis Start",
                answer: "",
                children: []
            };
            
            if (sortedPaths.length === 0) {
                root.children.push({
                    name: "Final",
                    question: finalRecommendation,
                    answer: "No decision paths recorded",
                    level: finalRecommendation
                });
                return root;
            }
            
            let currentNode = root;
            
            sortedPaths.forEach((path, index) => {
                const newNode = {
                    name: `Step ${path.stepOrder}`,
                    step: path.stepOrder,
                    question: path.questionText,
                    answer: path.selectedAnswer,
                    level: path.cleanCoreLevel,
                    children: []
                };
                
                currentNode.children.push(newNode);
                currentNode = newNode;
            });
            
            // Add final recommendation node
            currentNode.children.push({
                name: "Final",
                question: "Final Recommendation",
                answer: finalRecommendation,
                level: finalRecommendation
            });
            
            return root;
        },

        /**
         * Get node color based on data
         */
        _getNodeColor: function(nodeData) {
            if (nodeData.name === "Start") return "#f0f0f0";
            if (nodeData.name === "Final") {
                const colors = this._getLevelColor(nodeData.level);
                return colors.bg;
            }
            
            if (!nodeData.level) return "#ffffff";
            
            const colors = this._getLevelColor(nodeData.level);
            return colors.bg;
        },

        /**
         * Get node border color
         */
        _getNodeBorderColor: function(nodeData) {
            if (nodeData.name === "Start") return "#757575";
            if (nodeData.name === "Final") {
                const colors = this._getLevelColor(nodeData.level);
                return colors.border;
            }
            
            if (!nodeData.level) return "#757575";
            
            const colors = this._getLevelColor(nodeData.level);
            return colors.border;
        },

        /**
         * Handle node click
         */
        _onNodeClick: function(event, nodeData) {
            if (typeof sap !== 'undefined' && sap.m && sap.m.MessageBox) {
                let message = `Question: ${nodeData.data.question}\n\nAnswer: ${nodeData.data.answer}`;
                if (nodeData.data.level) {
                    message += `\n\nClean Core Level: ${nodeData.data.level}`;
                }
                
                sap.m.MessageBox.information(message, {
                    title: nodeData.data.step ? `Step ${nodeData.data.step} Details` : "Details"
                });
            }
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
         * Export flowchart as PNG using html2canvas
         * @param {string} containerId - Container DOM element ID
         * @param {string} filename - Output filename
         * @returns {Promise}
         */
        exportAsPNG: function(containerId, filename) {
            return new Promise((resolve, reject) => {
                // Check if html2canvas is available
                if (typeof html2canvas === 'undefined') {
                    // Fallback to basic export
                    const container = document.getElementById(containerId);
                    const svgElement = container.querySelector("svg");
                    if (svgElement) {
                        this._exportSVGAsPNG(svgElement, filename);
                        resolve();
                    } else {
                        reject(new Error("SVG element not found"));
                    }
                    return;
                }

                const container = document.getElementById(containerId);
                if (!container) {
                    reject(new Error("Container not found"));
                    return;
                }

                html2canvas(container, {
                    backgroundColor: "#ffffff",
                    scale: 2, // Higher resolution
                    logging: false
                }).then(canvas => {
                    canvas.toBlob(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename || "flowchart.png";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        resolve();
                    });
                }).catch(error => {
                    console.error("Error exporting PNG:", error);
                    reject(error);
                });
            });
        },

        /**
         * Fallback PNG export without html2canvas
         */
        _exportSVGAsPNG: function(svgElement, filename) {
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
         * Export flowchart as PDF using jsPDF
         * @param {string} containerId - Container DOM element ID
         * @param {Object} analysisData - Analysis data for header info
         * @param {string} filename - Output filename
         * @returns {Promise}
         */
        exportAsPDF: function(containerId, analysisData, filename) {
            return new Promise((resolve, reject) => {
                // Check if jsPDF and html2canvas are available
                if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
                    // Fallback to SVG export
                    console.warn("jsPDF or html2canvas not available, exporting as SVG");
                    this.exportAsSVG(containerId, filename);
                    resolve();
                    return;
                }

                const container = document.getElementById(containerId);
                if (!container) {
                    reject(new Error("Container not found"));
                    return;
                }

                html2canvas(container, {
                    backgroundColor: "#ffffff",
                    scale: 2
                }).then(canvas => {
                    const imgData = canvas.toDataURL("image/png");
                    
                    // Create PDF in landscape mode
                    const { jsPDF } = jspdf;
                    const pdf = new jsPDF({
                        orientation: "landscape",
                        unit: "mm",
                        format: "a4"
                    });
                    
                    // Add header
                    pdf.setFontSize(16);
                    pdf.text("SAP Clean Core Decision Flowchart", 15, 15);
                    
                    pdf.setFontSize(10);
                    pdf.text(`RICEFW ID: ${analysisData.ricefwId || 'N/A'}`, 15, 25);
                    pdf.text(`Object: ${analysisData.objectName || 'N/A'}`, 15, 30);
                    pdf.text(`Recommendation: ${analysisData.finalRecommendation || 'N/A'}`, 15, 35);
                    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 250, 15);
                    
                    // Add flowchart image
                    const imgWidth = 277; // A4 landscape width in mm
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    const pageHeight = 190; // A4 landscape height minus margins
                    
                    if (imgHeight <= pageHeight) {
                        pdf.addImage(imgData, "PNG", 10, 45, imgWidth - 20, imgHeight);
                    } else {
                        // Image is too tall, scale it down
                        const scaledHeight = pageHeight;
                        const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
                        pdf.addImage(imgData, "PNG", 10, 45, scaledWidth, scaledHeight);
                    }
                    
                    // Save PDF
                    pdf.save(filename || `flowchart-${analysisData.ricefwId || 'export'}.pdf`);
                    resolve();
                }).catch(error => {
                    console.error("Error exporting PDF:", error);
                    reject(error);
                });
            });
        },

        /**
         * Export as SVG file
         * @param {string} containerId - Container DOM element ID
         * @param {string} filename - Output filename
         */
        exportAsSVG: function(containerId, filename) {
            const container = document.getElementById(containerId);
            const svgElement = container.querySelector("svg");
            
            if (!svgElement) {
                console.error("SVG element not found");
                return;
            }

            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (filename || "flowchart") + ".svg";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        /**
         * Enhanced interactivity features
         */
        
        /**
         * Add hover tooltips to nodes
         * @param {Object} node - D3 node selection
         * @param {Object} data - Node data
         * @private
         */
        _addNodeTooltip: function(node, data) {
            if (!node || !data) return;
            
            // Create tooltip div if it doesn't exist
            let tooltip = document.getElementById("flowchart-tooltip");
            if (!tooltip) {
                tooltip = document.createElement("div");
                tooltip.id = "flowchart-tooltip";
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 10000;
                    max-width: 300px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    display: none;
                `;
                document.body.appendChild(tooltip);
            }
            
            node.on("mouseover", (event, d) => {
                const tooltipHtml = this._buildTooltipContent(d.data);
                tooltip.innerHTML = tooltipHtml;
                tooltip.style.display = "block";
                tooltip.style.left = (event.pageX + 10) + "px";
                tooltip.style.top = (event.pageY - 30) + "px";
            })
            .on("mousemove", (event) => {
                tooltip.style.left = (event.pageX + 10) + "px";
                tooltip.style.top = (event.pageY - 30) + "px";
            })
            .on("mouseout", () => {
                tooltip.style.display = "none";
            });
        },
        
        /**
         * Build tooltip HTML content
         * @param {Object} data - Node data
         * @returns {string} HTML string
         * @private
         */
        _buildTooltipContent: function(data) {
            let html = "";
            
            if (data.step) {
                html += `<div style="font-weight: bold; margin-bottom: 6px;">Step ${data.step}</div>`;
            }
            
            if (data.question) {
                html += `<div style="margin-bottom: 4px;"><strong>Question:</strong><br/>${data.question}</div>`;
            }
            
            if (data.answer) {
                html += `<div style="margin-bottom: 4px;"><strong>Answer:</strong><br/>${data.answer}</div>`;
            }
            
            if (data.hint) {
                html += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
                    <strong>Hint:</strong><br/>${data.hint}
                </div>`;
            }
            
            if (data.type) {
                html += `<div style="margin-top: 4px; color: #87CEEB;"><em>Node Type: ${data.type}</em></div>`;
            }
            
            return html || "<div>No additional information</div>";
        },
        
        /**
         * Handle node click events
         * @param {Object} event - Click event
         * @param {Object} d - Node data
         * @private
         */
        _onNodeClick: function(event, d) {
            // Highlight clicked node and path
            this._highlightDecisionPath(d);
            
            // Show detailed information dialog (if available)
            if (window.sap && window.sap.m && window.sap.m.MessageBox) {
                const message = this._buildNodeDetailsMessage(d.data);
                window.sap.m.MessageBox.information(message, {
                    title: `Step ${d.data.step || 'N/A'} Details`,
                    styleClass: "sapUiSizeCompact"
                });
            }
            
            event.stopPropagation();
        },
        
        /**
         * Build detailed message for node
         * @param {Object} data - Node data
         * @returns {string} Message text
         * @private
         */
        _buildNodeDetailsMessage: function(data) {
            let message = "";
            
            if (data.question) {
                message += `Question:\n${data.question}\n\n`;
            }
            
            if (data.answer) {
                message += `Your Answer:\n${data.answer}\n\n`;
            }
            
            if (data.hint) {
                message += `Guidance:\n${data.hint}\n\n`;
            }
            
            if (data.timestamp) {
                message += `Answered: ${new Date(data.timestamp).toLocaleString()}`;
            }
            
            return message || "No details available";
        },
        
        /**
         * Highlight the decision path from root to selected node
         * @param {Object} targetNode - Target D3 node
         * @private
         */
        _highlightDecisionPath: function(targetNode) {
            // Reset all nodes and links
            d3.selectAll(".node rect")
                .style("stroke-width", 2)
                .style("opacity", 0.3);
            
            d3.selectAll(".link")
                .style("stroke-width", 2)
                .style("opacity", 0.3)
                .style("stroke", "#999");
            
            // Highlight path from root to selected node
            let currentNode = targetNode;
            const pathNodes = [];
            
            while (currentNode) {
                pathNodes.push(currentNode);
                currentNode = currentNode.parent;
            }
            
            // Highlight nodes in path
            pathNodes.forEach(node => {
                d3.select(node.data.element || node) 
                    .select("rect")
                    .style("stroke-width", 4)
                    .style("opacity", 1);
            });
            
            // Highlight links in path
            d3.selectAll(".link")
                .each(function(d) {
                    if (pathNodes.includes(d.source) && pathNodes.includes(d.target)) {
                        d3.select(this)
                            .style("stroke-width", 4)
                            .style("opacity", 1)
                            .style("stroke", "#0078D4")
                            .transition()
                            .duration(500)
                            .style("stroke-width", 3);
                    }
                });
        },
        
        /**
         * Add node click animation
         * @param {Object} node - D3 node selection
         * @private
         */
        _addNodeClickAnimation: function(node) {
            if (!node) return;
            
            node.on("click", function() {
                d3.select(this).select("rect")
                    .transition()
                    .duration(200)
                    .attr("width", 190)
                    .attr("height", 75)
                    .attr("x", -95)
                    .attr("y", -37.5)
                    .transition()
                    .duration(200)
                    .attr("width", 180)
                    .attr("height", 70)
                    .attr("x", -90)
                    .attr("y", -35);
            });
        },
        
        /**
         * Add path highlighting on hover
         * @param {Object} links - D3 link selection
         * @private
         */
        _addPathHoverEffect: function(links) {
            if (!links) return;
            
            links.on("mouseover", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("stroke-width", 4)
                    .style("stroke", "#0078D4");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("stroke-width", 2)
                    .style("stroke", "#999");
            });
        },
        
        /**
         * Enable node dragging (for manual layout adjustment)
         * @param {Object} node - D3 node selection
         * @private
         */
        _enableNodeDragging: function(node) {
            if (!node || !d3.drag) return;
            
            const drag = d3.drag()
                .on("start", function(event, d) {
                    d3.select(this).raise().classed("dragging", true);
                })
                .on("drag", function(event, d) {
                    d.x = event.y;
                    d.y = event.x;
                    d3.select(this).attr("transform", `translate(${d.y},${d.x})`);
                    
                    // Update connected links
                    d3.selectAll(".link")
                        .filter(l => l.source === d || l.target === d)
                        .attr("d", d3.linkHorizontal()
                            .x(linkData => linkData.y)
                            .y(linkData => linkData.x)
                        );
                })
                .on("end", function() {
                    d3.select(this).classed("dragging", false);
                });
            
            node.call(drag);
        },
        
        /**
         * Add search/filter functionality for nodes
         * @param {string} searchText - Text to search for
         * @param {string} containerId - Container ID
         */
        searchNodes: function(searchText, containerId) {
            if (!searchText || !containerId) return;
            
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const searchLower = searchText.toLowerCase();
            
            // Reset all nodes
            d3.selectAll(".node rect")
                .style("opacity", 1)
                .style("stroke-width", 2);
            
            // Highlight matching nodes
            d3.selectAll(".node")
                .each(function(d) {
                    const question = (d.data.question || "").toLowerCase();
                    const answer = (d.data.answer || "").toLowerCase();
                    
                    if (question.includes(searchLower) || answer.includes(searchLower)) {
                        d3.select(this).select("rect")
                            .style("stroke-width", 4)
                            .style("stroke", "#FF6B6B");
                    } else {
                        d3.select(this).select("rect")
                            .style("opacity", 0.3);
                    }
                });
        },
        
        /**
         * Reset flowchart view (clear highlights, reset zoom)
         * @param {string} containerId - Container ID
         */
        resetFlowchartView: function(containerId) {
            if (!containerId) return;
            
            // Reset node styles
            d3.selectAll(".node rect")
                .style("opacity", 1)
                .style("stroke-width", 2);
            
            // Reset link styles
            d3.selectAll(".link")
                .style("opacity", 1)
                .style("stroke-width", 2)
                .style("stroke", "#999");
            
            // Reset zoom
            const container = document.getElementById(containerId);
            if (container) {
                const svg = d3.select(`#${containerId} svg`);
                if (svg.node() && svg.node().__zoom) {
                    svg.transition()
                        .duration(750)
                        .call(d3.zoom().transform, d3.zoomIdentity);
                }
            }
        }
    };
});
