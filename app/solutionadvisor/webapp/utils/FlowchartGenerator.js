/* global html2canvas, jspdf, XMLSerializer, Image, Blob */
sap.ui.define([
    "sap/base/Log"
], function (Log) {
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
        generateFlowchart: function (analysisData, containerId) {
            // Check if D3 is available with all required features (tree, zoom, hierarchy)
            if (typeof window !== 'undefined' && typeof window.d3 !== 'undefined' && window.d3.zoom && window.d3.tree && window.d3.hierarchy) {
                return this._generateD3Flowchart(analysisData, containerId);
            } else {
                // Fallback to basic SVG (D3 not available or incomplete)
                return this._generateBasicFlowchart(analysisData, containerId);
            }
        },

        /**
         * Generate D3.js flowchart with zoom and interaction
         */
        _generateD3Flowchart: function (analysisData, containerId) {
            return new Promise((resolve, reject) => {
                try {
                    const decisionPaths = analysisData.decisionPaths || [];
                    const finalRecommendation = analysisData.finalRecommendation || "Unknown";

                    // Configuration - Enhanced with better spacing and margins
                    const margin = { top: 80, right: 160, bottom: 80, left: 160 };
                    const width = 1400 - margin.left - margin.right;
                    const height = 1200 - margin.top - margin.bottom;

                    // Clear existing content
                    const container = document.getElementById(containerId);
                    if (!container) {
                        reject(new Error("Container not found"));
                        return;
                    }
                    container.innerHTML = "";

                    // Create SVG with D3
                    const svg = window.d3.select(`#${containerId}`)
                        .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    const g = svg.append("g")
                        .attr("transform", `translate(${margin.left},${margin.top})`);

                    // Add zoom behavior
                    const zoom = window.d3.zoom()
                        .scaleExtent([0.3, 3])
                        .on("zoom", (event) => {
                            g.attr("transform", event.transform);
                        });

                    svg.call(zoom);

                    // Transform decision paths to tree data
                    const treeData = this._transformToHierarchy(decisionPaths, finalRecommendation);

                    // Create tree layout - VERTICAL orientation (swap width/height)
                    const treemap = window.d3.tree().size([width, height]);

                    // Assign nodes and links
                    const root = window.d3.hierarchy(treeData);
                    root.x0 = width / 2;
                    root.y0 = 0;

                    const treeNodes = treemap(root);

                    // Add enhanced arrow marker with better styling
                    const defs = svg.append("defs");

                    // Primary arrow (blue) for main flow
                    defs.append("marker")
                        .attr("id", "arrowhead")
                        .attr("markerWidth", 13)
                        .attr("markerHeight", 13)
                        .attr("refX", 12)
                        .attr("refY", 6)
                        .attr("orient", "auto")
                        .append("polygon")
                        .attr("points", "0 0, 13 6, 0 12")
                        .attr("fill", "#1976D2");

                    // Secondary arrow for highlight on hover
                    defs.append("marker")
                        .attr("id", "arrowhead-highlight")
                        .attr("markerWidth", 13)
                        .attr("markerHeight", 13)
                        .attr("refX", 12)
                        .attr("refY", 6)
                        .attr("orient", "auto")
                        .append("polygon")
                        .attr("points", "0 0, 13 6, 0 12")
                        .attr("fill", "#0078D4");

                    // Add gradient background to SVG
                    defs.append("linearGradient")
                        .attr("id", "bgGradient")
                        .attr("x1", "0%")
                        .attr("y1", "0%")
                        .attr("x2", "100%")
                        .attr("y2", "100%")
                        .selectAll("stop")
                        .data([
                            { offset: "0%", color: "#fafafa" },
                            { offset: "100%", color: "#f5f5f5" }
                        ])
                        .enter()
                        .append("stop")
                        .attr("offset", d => d.offset)
                        .attr("stop-color", d => d.color);

                    // Add background rectangle with gradient
                    svg.insert("rect", ":first-child")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .attr("fill", "url(#bgGradient)");

                    // Draw links (connections) - VERTICAL orientation with enhanced styling
                    g.selectAll(".link")
                        .data(treeNodes.links())
                        .enter()
                        .append("path")
                        .attr("class", "link")
                        .attr("fill", "none")
                        .attr("stroke", "#1976D2")
                        .attr("stroke-width", 2.5)
                        .attr("stroke-linecap", "round")
                        .attr("stroke-linejoin", "round")
                        .attr("marker-end", "url(#arrowhead)")
                        .attr("opacity", 0.7)
                        .attr("d", window.d3.linkVertical()
                            .x(d => d.x)
                            .y(d => d.y)
                        )
                        .on("mouseover", function () {
                            window.d3.select(this)
                                .transition()
                                .duration(200)
                                .attr("stroke-width", 3.5)
                                .attr("stroke", "#0078D4")
                                .attr("opacity", 1)
                                .attr("marker-end", "url(#arrowhead-highlight)");
                        })
                        .on("mouseout", function () {
                            window.d3.select(this)
                                .transition()
                                .duration(200)
                                .attr("stroke-width", 2.5)
                                .attr("stroke", "#1976D2")
                                .attr("opacity", 0.7)
                                .attr("marker-end", "url(#arrowhead)");
                        });

                    // Draw nodes - VERTICAL orientation
                    const node = g.selectAll(".node")
                        .data(treeNodes.descendants())
                        .enter()
                        .append("g")
                        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
                        .attr("transform", d => `translate(${d.x},${d.y})`);

                    // Add rectangles for nodes with dynamic height - Enhanced styling
                    node.append("rect")
                        .attr("width", 240)
                        .attr("height", d => {
                            // Calculate height based on text length
                            const questionLines = this._calculateTextLines(d.data.question || "", 32);
                            const answerLines = this._calculateTextLines(d.data.answer || "", 37);
                            return Math.max(110, 40 + (questionLines * 16) + (answerLines * 14));
                        })
                        .attr("x", -120)
                        .attr("y", d => {
                            const questionLines = this._calculateTextLines(d.data.question || "", 32);
                            const answerLines = this._calculateTextLines(d.data.answer || "", 37);
                            const height = Math.max(110, 40 + (questionLines * 16) + (answerLines * 14));
                            return -height / 2;
                        })
                        .attr("rx", 8)
                        .attr("ry", 8)
                        .style("fill", d => this._getNodeColor(d.data))
                        .style("stroke", d => this._getNodeBorderColor(d.data))
                        .style("stroke-width", 2.5)
                        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
                        .style("cursor", "pointer")
                        .on("mouseover", function () {
                            window.d3.select(this)
                                .transition()
                                .duration(200)
                                .attr("stroke-width", 3)
                                .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");
                        })
                        .on("mouseout", function () {
                            window.d3.select(this)
                                .transition()
                                .duration(200)
                                .attr("stroke-width", 2.5)
                                .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
                        })
                        .on("click", (event, d) => {
                            this._onNodeClick(event, d);
                        });

                    // Add question text with wrapping - positioned in upper half
                    node.each(function (d) {
                        const nodeGroup = window.d3.select(this);
                        const questionText = d.data.question || "";
                        const wrappedLines = window.FlowchartGenerator._wrapText(questionText, 32);

                        // Calculate starting Y position for questions (upper portion of box)
                        let yOffset = -28;
                        wrappedLines.forEach((line, i) => {
                            nodeGroup.append("text")
                                .attr("x", 0)
                                .attr("y", yOffset + (i * 16))
                                .attr("text-anchor", "middle")
                                .style("font-size", "12px")
                                .style("font-weight", "600")
                                .style("font-family", "'SAP UI 72', sans-serif")
                                .style("fill", "#1a1a1a")
                                .style("line-height", "1.3")
                                .text(line);
                        });
                    });

                    // Add answer text with wrapping - positioned in lower half, below questions
                    node.each(function (d) {
                        const nodeGroup = window.d3.select(this);
                        const answerText = d.data.answer || "";
                        if (answerText) {
                            const wrappedLines = window.FlowchartGenerator._wrapText(answerText, 37);
                            const questionLines = window.FlowchartGenerator._calculateTextLines(d.data.question || "", 32);

                            // Start answer text AFTER question text with spacing
                            let yOffset = -28 + (questionLines * 16) + 10;
                            wrappedLines.forEach((line, i) => {
                                nodeGroup.append("text")
                                    .attr("x", 0)
                                    .attr("y", yOffset + (i * 14))
                                    .attr("text-anchor", "middle")
                                    .style("font-size", "11px")
                                    .style("font-family", "'SAP UI 72', sans-serif")
                                    .style("fill", "#555")
                                    .style("font-style", "italic")
                                    .text(line);
                            });
                        }
                    });

                    // Add step number badge - enhanced styling
                    node.filter(d => d.data.step)
                        .append("circle")
                        .attr("cx", -108)
                        .attr("cy", d => {
                            const questionLines = this._calculateTextLines(d.data.question || "", 32);
                            const answerLines = this._calculateTextLines(d.data.answer || "", 37);
                            const height = Math.max(110, 40 + (questionLines * 16) + (answerLines * 14));
                            return -(height / 2) + 18;
                        })
                        .attr("r", 16)
                        .style("fill", "#0078D4")
                        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
                        .style("cursor", "pointer");

                    node.filter(d => d.data.step)
                        .append("text")
                        .attr("x", -108)
                        .attr("y", d => {
                            const questionLines = this._calculateTextLines(d.data.question || "", 32);
                            const answerLines = this._calculateTextLines(d.data.answer || "", 37);
                            const height = Math.max(110, 40 + (questionLines * 16) + (answerLines * 14));
                            return -(height / 2) + 23;
                        })
                        .attr("text-anchor", "middle")
                        .style("fill", "white")
                        .style("font-size", "11px")
                        .style("font-weight", "bold")
                        .style("font-family", "'SAP UI 72', sans-serif")
                        .text(d => d.data.step);

                    resolve(svg.node());
                } catch (error) {
                    Log.error("Error generating D3 flowchart:", error);
                    reject(error);
                }
            });
        },

        /**
         * Basic SVG flowchart (fallback when D3 is not available) - VERTICAL layout
         */
        _generateBasicFlowchart: function (analysisData, containerId) {
            return new Promise((resolve) => {
                const decisionPaths = analysisData.decisionPaths || [];
                const finalRecommendation = analysisData.finalRecommendation || "Unknown";

                // Enhanced Configuration - VERTICAL layout with better spacing
                const nodeWidth = 300;
                const baseNodeHeight = 120;
                const verticalSpacing = 120; // Increased space between nodes
                const containerWidth = 1400;
                const startX = (containerWidth - nodeWidth) / 2; // Center horizontally
                const startY = 80;

                // Calculate SVG dimensions
                const totalWidth = containerWidth;
                const totalHeight = startY + ((decisionPaths.length + 2) * (baseNodeHeight + verticalSpacing)) + 120;

                // Create SVG with background
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("width", totalWidth);
                svg.setAttribute("height", totalHeight);
                svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
                svg.style.backgroundColor = "#fafafa";

                // Add gradient definitions
                const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

                // Background gradient
                const bgGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
                bgGradient.setAttribute("id", "basicBgGradient");
                bgGradient.setAttribute("x1", "0%");
                bgGradient.setAttribute("y1", "0%");
                bgGradient.setAttribute("x2", "100%");
                bgGradient.setAttribute("y2", "100%");
                const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                stop1.setAttribute("offset", "0%");
                stop1.setAttribute("stop-color", "#fafafa");
                const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                stop2.setAttribute("offset", "100%");
                stop2.setAttribute("stop-color", "#f5f5f5");
                bgGradient.appendChild(stop1);
                bgGradient.appendChild(stop2);
                defs.appendChild(bgGradient);

                // Enhanced arrow marker (primary)
                const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
                marker.setAttribute("id", "arrowhead-basic");
                marker.setAttribute("markerWidth", "13");
                marker.setAttribute("markerHeight", "13");
                marker.setAttribute("refX", "12");
                marker.setAttribute("refY", "6");
                marker.setAttribute("orient", "auto");
                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("points", "0 0, 13 6, 0 12");
                polygon.setAttribute("fill", "#1976D2");
                marker.appendChild(polygon);
                defs.appendChild(marker);

                svg.appendChild(defs);

                // Add background rectangle
                const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                bgRect.setAttribute("width", totalWidth);
                bgRect.setAttribute("height", totalHeight);
                bgRect.setAttribute("fill", "url(#basicBgGradient)");
                svg.insertBefore(bgRect, svg.firstChild);

                // Draw start node - enhanced styling
                const startNodeY = startY;
                const startNodeHeight = baseNodeHeight;
                const startRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                startRect.setAttribute("x", startX);
                startRect.setAttribute("y", startNodeY);
                startRect.setAttribute("width", nodeWidth);
                startRect.setAttribute("height", startNodeHeight);
                startRect.setAttribute("fill", "#e3f2fd");
                startRect.setAttribute("stroke", "#1976d2");
                startRect.setAttribute("stroke-width", "2.5");
                startRect.setAttribute("rx", "10");
                startRect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
                svg.appendChild(startRect);

                const startText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                startText.setAttribute("x", startX + nodeWidth / 2);
                startText.setAttribute("y", startNodeY + startNodeHeight / 2 + 6);
                startText.setAttribute("text-anchor", "middle");
                startText.setAttribute("font-size", "15");
                startText.setAttribute("font-weight", "600");
                startText.setAttribute("font-family", "'SAP UI 72', sans-serif");
                startText.setAttribute("fill", "#1976d2");
                startText.textContent = "Start Analysis";
                svg.appendChild(startText);

                // Track previous node position
                let prevY = startNodeY + startNodeHeight;

                // Draw decision nodes vertically
                decisionPaths.forEach((path, index) => {
                    // Calculate dynamic height based on question text
                    const questionLines = this._wrapText(path.questionText || "", 38);
                    const answerLines = this._wrapText(path.selectedAnswer || "", 42);
                    const nodeHeight = Math.max(baseNodeHeight, 50 + (questionLines.length * 16) + (answerLines.length * 14));

                    const y = prevY + verticalSpacing;

                    // Draw connection line from previous node (vertical) - enhanced
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", startX + nodeWidth / 2);
                    line.setAttribute("y1", prevY);
                    line.setAttribute("x2", startX + nodeWidth / 2);
                    line.setAttribute("y2", y);
                    line.setAttribute("stroke", "#1976D2");
                    line.setAttribute("stroke-width", "2.5");
                    line.setAttribute("stroke-linecap", "round");
                    line.setAttribute("marker-end", "url(#arrowhead-basic)");
                    line.setAttribute("opacity", "0.7");
                    svg.appendChild(line);

                    // Draw node rectangle with dynamic height - enhanced
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("x", startX);
                    rect.setAttribute("y", y);
                    rect.setAttribute("width", nodeWidth);
                    rect.setAttribute("height", nodeHeight);
                    rect.setAttribute("fill", "#fff");
                    rect.setAttribute("stroke", "#2196f3");
                    rect.setAttribute("stroke-width", "2.5");
                    rect.setAttribute("rx", "8");
                    rect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
                    svg.appendChild(rect);

                    // Add question number badge - enhanced
                    const badge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    badge.setAttribute("cx", startX + 25);
                    badge.setAttribute("cy", y + 25);
                    badge.setAttribute("r", "18");
                    badge.setAttribute("fill", "#0078D4");
                    badge.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))");
                    svg.appendChild(badge);

                    const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    badgeText.setAttribute("x", startX + 25);
                    badgeText.setAttribute("y", y + 32);
                    badgeText.setAttribute("text-anchor", "middle");
                    badgeText.setAttribute("font-size", "13");
                    badgeText.setAttribute("font-weight", "bold");
                    badgeText.setAttribute("font-family", "'SAP UI 72', sans-serif");
                    badgeText.setAttribute("fill", "#fff");
                    badgeText.textContent = `${index + 1}`;
                    svg.appendChild(badgeText);

                    // Add wrapped question text
                    let textY = y + 50;
                    questionLines.forEach((line, lineIndex) => {
                        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        text.setAttribute("x", startX + nodeWidth / 2);
                        text.setAttribute("y", textY + (lineIndex * 16));
                        text.setAttribute("text-anchor", "middle");
                        text.setAttribute("font-size", "12");
                        text.setAttribute("font-weight", "600");
                        text.setAttribute("font-family", "'SAP UI 72', sans-serif");
                        text.setAttribute("fill", "#1a1a1a");
                        text.textContent = line;
                        svg.appendChild(text);
                    });

                    // Add answer text below the question (if exists)
                    if (path.selectedAnswer) {
                        const answerLines = this._wrapText(path.selectedAnswer, 42);
                        let answerY = y + 50 + (questionLines.length * 16) + 6;
                        answerLines.forEach((line, lineIndex) => {
                            const answerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            answerText.setAttribute("x", startX + nodeWidth / 2);
                            answerText.setAttribute("y", answerY + (lineIndex * 14));
                            answerText.setAttribute("text-anchor", "middle");
                            answerText.setAttribute("font-size", "11");
                            answerText.setAttribute("fill", "#555");
                            answerText.setAttribute("font-style", "italic");
                            answerText.setAttribute("font-family", "'SAP UI 72', sans-serif");
                            answerText.textContent = line;
                            svg.appendChild(answerText);
                        });
                    }

                    prevY = y + nodeHeight;
                });

                // Draw final recommendation node - enhanced
                const finalY = prevY + verticalSpacing;

                // Calculate dynamic height for final recommendation
                const recLines = this._wrapText(finalRecommendation, 42);
                const finalNodeHeight = Math.max(120, 60 + (recLines.length * 16));

                // Connection to final node - enhanced
                const finalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                finalLine.setAttribute("x1", startX + nodeWidth / 2);
                finalLine.setAttribute("y1", prevY);
                finalLine.setAttribute("x2", startX + nodeWidth / 2);
                finalLine.setAttribute("y2", finalY);
                finalLine.setAttribute("stroke", "#1976D2");
                finalLine.setAttribute("stroke-width", "2.5");
                finalLine.setAttribute("stroke-linecap", "round");
                finalLine.setAttribute("marker-end", "url(#arrowhead-basic)");
                finalLine.setAttribute("opacity", "0.7");
                svg.appendChild(finalLine);

                // Final recommendation node - enhanced with gradient
                const finalColor = this._getLevelColor(finalRecommendation);
                const finalRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                finalRect.setAttribute("x", startX);
                finalRect.setAttribute("y", finalY);
                finalRect.setAttribute("width", nodeWidth);
                finalRect.setAttribute("height", finalNodeHeight);
                finalRect.setAttribute("fill", finalColor.bg);
                finalRect.setAttribute("stroke", finalColor.border);
                finalRect.setAttribute("stroke-width", "3");
                finalRect.setAttribute("rx", "10");
                finalRect.setAttribute("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.15))");
                svg.appendChild(finalRect);

                const finalTitleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                finalTitleText.setAttribute("x", startX + nodeWidth / 2);
                finalTitleText.setAttribute("y", finalY + 30);
                finalTitleText.setAttribute("text-anchor", "middle");
                finalTitleText.setAttribute("font-size", "12");
                finalTitleText.setAttribute("font-weight", "600");
                finalTitleText.setAttribute("font-family", "'SAP UI 72', sans-serif");
                finalTitleText.setAttribute("fill", finalColor.border);
                finalTitleText.textContent = "Final Recommendation";
                svg.appendChild(finalTitleText);

                // Wrap and display final recommendation text
                recLines.forEach((line, idx) => {
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", startX + nodeWidth / 2);
                    text.setAttribute("y", finalY + 60 + (idx * 16));
                    text.setAttribute("text-anchor", "middle");
                    text.setAttribute("font-size", "13");
                    text.setAttribute("font-weight", "bold");
                    text.setAttribute("font-family", "'SAP UI 72', sans-serif");
                    text.setAttribute("fill", finalColor.border);
                    text.textContent = line;
                    svg.appendChild(text);
                });

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
        _transformToHierarchy: function (decisionPaths, finalRecommendation) {
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

            sortedPaths.forEach((path) => {
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
        _getNodeColor: function (nodeData) {
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
        _getNodeBorderColor: function (nodeData) {
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
        _onNodeClick: function (event, nodeData) {
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
         * Wrap text to fit within specified character width
         * @param {string} text - Text to wrap
         * @param {number} maxCharsPerLine - Maximum characters per line
         * @returns {Array} Array of text lines
         */
        _wrapText: function (text, maxCharsPerLine) {
            if (!text) return [];

            const words = text.split(/\s+/);
            const lines = [];
            let currentLine = "";

            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;

                if (testLine.length <= maxCharsPerLine) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        lines.push(currentLine);
                    }
                    // If single word is longer than max, split it
                    if (word.length > maxCharsPerLine) {
                        let remainingWord = word;
                        while (remainingWord.length > maxCharsPerLine) {
                            lines.push(remainingWord.substring(0, maxCharsPerLine - 1) + "-");
                            remainingWord = remainingWord.substring(maxCharsPerLine - 1);
                        }
                        currentLine = remainingWord;
                    } else {
                        currentLine = word;
                    }
                }
            });

            if (currentLine) {
                lines.push(currentLine);
            }

            return lines;
        },

        /**
         * Calculate number of lines needed for text
         * @param {string} text - Text to measure
         * @param {number} maxCharsPerLine - Maximum characters per line
         * @returns {number} Number of lines
         */
        _calculateTextLines: function (text, maxCharsPerLine) {
            if (!text) return 0;
            return this._wrapText(text, maxCharsPerLine).length;
        },

        /**
         * Truncate text to specified length
         */
        _truncateText: function (text, maxLength) {
            if (!text) return "";
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength - 3) + "...";
        },

        /**
         * Get color scheme for clean core level
         */
        _getLevelColor: function (level) {
            // Colors based on SAP Fiori semantic colors and Analyses List page formatting
            // Level A (Most Ideal): Green - Fully Clean Core
            // Level B (Recommended): Blue - Enhanced Clean Core  
            // Level C (Acceptable): Orange - Compliant Modifications
            // Level D (To Be Avoided): Red - Non-Compliant/Legacy
            
            // Extract level from recommendation text (e.g., "SAP Output Management - Level A" -> "Level A")
            let extractedLevel = level;
            if (level && typeof level === 'string') {
                const match = level.match(/Level\s+([ABCD])/i);
                if (match) {
                    extractedLevel = `Level ${match[1].toUpperCase()}`;
                }
            }
            
            const colors = {
                "Level A": { bg: "#d4edda", border: "#28a745", text: "#155724" },      // Success/Green
                "Level B": { bg: "#d1ecf1", border: "#17a2b8", text: "#0c5460" },      // Information/Cyan
                "Level C": { bg: "#fff3cd", border: "#ffc107", text: "#856404" },      // Warning/Orange
                "Level D": { bg: "#f8d7da", border: "#dc3545", text: "#721c24" }       // Error/Red
            };
            return colors[extractedLevel] || { bg: "#f5f5f5", border: "#9e9e9e", text: "#424242" };
        },

        /**
         * Export flowchart as PNG using html2canvas
         * @param {string} containerId - Container DOM element ID
         * @param {string} filename - Output filename
         * @returns {Promise}
         */
        exportAsPNG: function (containerId, filename) {
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
                    Log.error("Error exporting PNG:", error);
                    reject(error);
                });
            });
        },

        /**
         * Fallback PNG export without html2canvas
         */
        _exportSVGAsPNG: function (svgElement, filename) {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(function (blob) {
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
        exportAsPDF: function (containerId, analysisData, filename) {
            return new Promise((resolve, reject) => {
                // Check if jsPDF and html2canvas are available
                if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
                    // Fallback to SVG export
                    Log.warning("jsPDF or html2canvas not available, exporting as SVG");
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
                    Log.error("Error exporting PDF:", error);
                    reject(error);
                });
            });
        },

        /**
         * Export as SVG file
         * @param {string} containerId - Container DOM element ID
         * @param {string} filename - Output filename
         */
        exportAsSVG: function (containerId, filename) {
            const container = document.getElementById(containerId);
            const svgElement = container.querySelector("svg");

            if (!svgElement) {
                Log.error("SVG element not found");
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
        _addNodeTooltip: function (node, data) {
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
        _buildTooltipContent: function (data) {
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
         * Add node click animation
         * @param {Object} node - D3 node selection
         * @private
         */
        _addNodeClickAnimation: function (node) {
            if (!node) return;

            node.on("click", function () {
                window.d3.select(this).select("rect")
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
        _addPathHoverEffect: function (links) {
            if (!links) return;

            links.on("mouseover", function () {
                window.d3.select(this)
                    .transition()
                    .duration(200)
                    .style("stroke-width", 4)
                    .style("stroke", "#0078D4");
            })
                .on("mouseout", function () {
                    window.d3.select(this)
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
        _enableNodeDragging: function (node) {
            if (!node || !window.d3 || !window.d3.drag) return;

            const drag = window.d3.drag()
                .on("start", function () {
                    window.d3.select(this).raise().classed("dragging", true);
                })
                .on("drag", function (event, d) {
                    d.x = event.y;
                    d.y = event.x;
                    window.d3.select(this).attr("transform", `translate(${d.y},${d.x})`);

                    // Update connected links
                    window.d3.selectAll(".link")
                        .filter(l => l.source === d || l.target === d)
                        .attr("d", window.d3.linkHorizontal()
                            .x(linkData => linkData.y)
                            .y(linkData => linkData.x)
                        );
                })
                .on("end", function () {
                    window.d3.select(this).classed("dragging", false);
                });

            node.call(drag);
        },

        /**
         * Add search/filter functionality for nodes
         * @param {string} searchText - Text to search for
         * @param {string} containerId - Container ID
         */
        searchNodes: function (searchText, containerId) {
            if (!searchText || !containerId) return;

            const container = document.getElementById(containerId);
            if (!container) return;

            const searchLower = searchText.toLowerCase();

            // Reset all nodes
            window.d3.selectAll(".node rect")
                .style("opacity", 1)
                .style("stroke-width", 2);

            // Highlight matching nodes
            window.d3.selectAll(".node")
                .each(function (d) {
                    const question = (d.data.question || "").toLowerCase();
                    const answer = (d.data.answer || "").toLowerCase();

                    if (question.includes(searchLower) || answer.includes(searchLower)) {
                        window.d3.select(this).select("rect")
                            .style("stroke-width", 4)
                            .style("stroke", "#FF6B6B");
                    } else {
                        window.d3.select(this).select("rect")
                            .style("opacity", 0.3);
                    }
                });
        },

        /**
         * Reset flowchart view (clear highlights, reset zoom)
         * @param {string} containerId - Container ID
         */
        resetFlowchartView: function (containerId) {
            if (!containerId) return;

            // Reset node styles
            window.d3.selectAll(".node rect")
                .style("opacity", 1)
                .style("stroke-width", 2);

            // Reset link styles
            window.d3.selectAll(".link")
                .style("opacity", 1)
                .style("stroke-width", 2)
                .style("stroke", "#999");

            // Reset zoom
            const container = document.getElementById(containerId);
            if (container) {
                const svg = window.d3.select(`#${containerId} svg`);
                if (svg.node() && svg.node().__zoom) {
                    svg.transition()
                        .duration(750)
                        .call(window.d3.zoom().transform, window.d3.zoomIdentity);
                }
            }
        }
    };
});
