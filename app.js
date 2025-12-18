/**
 * RUC English Writing Assistant
 * Multi-level Feedback System for English Paragraph Revision
 */

// ============================================
// Configuration & Constants
// ============================================

const LEVEL_CONFIG = {
    1: {
        name: 'Macro Structure (PEEL)',
        description: 'Check if your paragraph has a complete PEEL structure: Point, Evidence, Explanation, Link.',
        action: 'check-peel'
    },
    2: {
        name: 'Evidence Types',
        description: 'Analyze the types of evidence used: Examples, Quotations, Data, or Reasoning.',
        action: 'check-evidence'
    },
    3: {
        name: 'Connectors',
        description: 'Examine logical connectors: Addition, Cause, Sequence, or Adversative.',
        action: 'check-connectors'
    },
    4: {
        name: 'Language Diagnosis',
        description: 'Evaluate grammar accuracy, vocabulary appropriateness, and sentence variety.',
        action: 'check-language'
    },
    5: {
        name: 'Comprehensive Summary',
        description: 'Receive a complete summary of your paragraph with encouragement for continued improvement.',
        action: 'final-summary'
    }
};

// Sample paragraphs for demonstration
const INITIAL_PARAGRAPHS = [
    {
        id: 1,
        title: 'Sample Paragraph',
        content: 'Technology has significantly transformed education in the 21st century. For example, online learning platforms like Coursera and edX have made quality education accessible to millions worldwide. This accessibility means that students from developing countries can now learn from top universities without leaving their homes. Moreover, digital tools have enabled personalized learning experiences that adapt to individual student needs. In conclusion, while technology brings challenges, its benefits to education are undeniable.',
        level: 1,
        history: [],
        contentHistory: [] // Version history
    }
];

// ============================================
// Application State
// ============================================

let state = {
    paragraphs: JSON.parse(JSON.stringify(INITIAL_PARAGRAPHS)),
    currentIndex: 0,
    isProcessing: false,
    sidebarOpen: true,
    editorFontSize: 14, // Default font size in pixels
    selectedHistoryIndex: null // Currently selected history version
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarClose: document.getElementById('sidebarClose'),
    menuBtn: document.getElementById('menuBtn'),
    paragraphList: document.getElementById('paragraphList'),
    addParagraph: document.getElementById('addParagraph'),
    paragraphIndicator: document.getElementById('paragraphIndicator'),
    editorTextarea: document.getElementById('editorTextarea'),
    lineNumbers: document.getElementById('lineNumbers'),
    prevParagraph: document.getElementById('prevParagraph'),
    nextParagraph: document.getElementById('nextParagraph'),
    levelBadge: document.getElementById('levelBadge'),
    levelTitle: document.getElementById('levelTitle'),
    levelDescription: document.getElementById('levelDescription'),
    sectionBadge: document.getElementById('sectionBadge'),
    progressFill: document.getElementById('progressFill'),
    feedbackChat: document.getElementById('feedbackChat'),
    chatWelcome: document.getElementById('chatWelcome'),
    actionButtons: document.getElementById('actionButtons'),
    prevLevel: document.getElementById('prevLevel'),
    nextLevel: document.getElementById('nextLevel'),
    editorPanel: document.getElementById('editorPanel'),
    feedbackPanel: document.getElementById('feedbackPanel'),
    resizeHandle: document.getElementById('resizeHandle'),
    fontSizeLabel: document.getElementById('fontSizeLabel'),
    decreaseFontSize: document.getElementById('decreaseFontSize'),
    increaseFontSize: document.getElementById('increaseFontSize'),
    historyBtn: document.getElementById('historyBtn'),
    historyModal: document.getElementById('historyModal'),
    closeHistoryModal: document.getElementById('closeHistoryModal'),
    historyList: document.getElementById('historyList'),
    historyTextarea: document.getElementById('historyTextarea'),
    historyContentTitle: document.getElementById('historyContentTitle'),
    copyHistoryContent: document.getElementById('copyHistoryContent')
};

// ============================================
// Utility Functions
// ============================================

function getCurrentParagraph() {
    return state.paragraphs[state.currentIndex];
}

function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// ============================================
// UI Update Functions
// ============================================

function updateLineNumbers() {
    const text = elements.editorTextarea.value;
    const lines = text.split('\n').length;
    const maxLines = Math.max(lines, 20);

    let numbersHtml = '';
    for (let i = 1; i <= maxLines; i++) {
        numbersHtml += `<span>${i}</span>`;
    }
    elements.lineNumbers.innerHTML = numbersHtml;
}

function updateParagraphList() {
    const html = state.paragraphs.map((p, idx) => `
        <li class="paragraph-item ${idx === state.currentIndex ? 'active' : ''}"
            data-index="${idx}"
            draggable="true">
            <div class="paragraph-item-header">
                <span class="paragraph-item-drag-handle">⋮⋮</span>
                <span class="paragraph-item-title">#${idx + 1} ${p.title}</span>
                <span class="paragraph-item-level">L${p.level}</span>
            </div>
            <p class="paragraph-item-preview">${p.content || '(Empty)'}</p>
        </li>
    `).join('');

    elements.paragraphList.innerHTML = html;

    // Add click handlers
    document.querySelectorAll('.paragraph-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 如果点击的是拖拽手柄，不触发切换
            if (e.target.classList.contains('paragraph-item-drag-handle')) {
                return;
            }
            const index = parseInt(item.dataset.index);
            switchParagraph(index);
        });
    });

    // Add drag handlers
    initDragAndDrop();
}

function updateEditor() {
    const paragraph = getCurrentParagraph();
    elements.editorTextarea.value = paragraph.content;
    updateLineNumbers();
}

function updateLevelIndicator() {
    const paragraph = getCurrentParagraph();
    const level = paragraph.level;
    const config = LEVEL_CONFIG[level];

    elements.levelBadge.textContent = `Level ${level}`;
    elements.levelTitle.textContent = config.name;
    elements.levelDescription.textContent = config.description;
    elements.sectionBadge.textContent = `Section #${state.currentIndex + 1}`;
    elements.progressFill.style.width = `${(level / 5) * 100}%`;

    // Update progress steps
    document.querySelectorAll('.progress-steps .step').forEach(step => {
        const stepLevel = parseInt(step.dataset.level);
        step.classList.remove('active', 'completed');
        if (stepLevel === level) {
            step.classList.add('active');
        } else if (stepLevel < level) {
            step.classList.add('completed');
        }
    });

    // Update action buttons visibility
    document.querySelectorAll('.action-group').forEach(group => {
        const groupLevel = parseInt(group.dataset.level);
        group.classList.toggle('hidden', groupLevel !== level);
    });

    // Update level navigation buttons
    elements.prevLevel.disabled = level <= 1;
    elements.nextLevel.disabled = level >= 5;
    elements.nextLevel.textContent = level >= 5 ? 'Complete' : 'Next Level →';
}

function updateParagraphIndicator() {
    elements.paragraphIndicator.textContent = `Paragraph ${state.currentIndex + 1} of ${state.paragraphs.length}`;
}

function updateNavigationButtons() {
    elements.prevParagraph.disabled = state.currentIndex === 0;
    elements.nextParagraph.disabled = state.currentIndex === state.paragraphs.length - 1;
}

function updateFeedbackChat() {
    const paragraph = getCurrentParagraph();

    if (paragraph.history.length === 0) {
        // 没有历史记录：显示欢迎消息
        elements.feedbackChat.innerHTML = `
            <div class="chat-welcome" id="chatWelcome">
                <div class="welcome-icon">&#128221;</div>
                <h3>Welcome to the Writing Feedback System</h3>
                <p>Enter your paragraph on the left, then use the buttons below to receive structured feedback across 5 levels:</p>
                <ul class="level-list">
                    <li><strong>Level 1:</strong> PEEL Structure Check</li>
                    <li><strong>Level 2:</strong> Evidence Type Analysis</li>
                    <li><strong>Level 3:</strong> Connector Detection</li>
                    <li><strong>Level 4:</strong> Language Diagnosis</li>
                    <li><strong>Level 5:</strong> Comprehensive Summary</li>
                </ul>
            </div>
        `;
        // 重新获取 chatWelcome 元素引用
        elements.chatWelcome = document.getElementById('chatWelcome');
    } else {
        // 有历史记录：显示消息
        const messagesHtml = paragraph.history.map(msg => {
            if (msg.type === 'feedback-card') {
                return msg.html;
            }
            return `
                <div class="chat-message ${msg.sender}">
                    <div class="message-bubble">
                        <div class="message-content">${msg.text}</div>
                        <div class="message-time">${msg.timestamp}</div>
                    </div>
                </div>
            `;
        }).join('');
        elements.feedbackChat.innerHTML = messagesHtml;
    }

    // Scroll to bottom
    elements.feedbackChat.scrollTop = elements.feedbackChat.scrollHeight;
}

function updateAll() {
    updateParagraphList();
    updateEditor();
    updateLevelIndicator();
    updateParagraphIndicator();
    updateNavigationButtons();
    updateFeedbackChat();
}

// ============================================
// Paragraph Management
// ============================================

function switchParagraph(index) {
    if (index >= 0 && index < state.paragraphs.length) {
        // Save current content before switching
        state.paragraphs[state.currentIndex].content = elements.editorTextarea.value;
        state.currentIndex = index;
        updateAll();
    }
}

function addNewParagraph() {
    const newParagraph = {
        id: generateId(),
        title: `Paragraph ${state.paragraphs.length + 1}`,
        content: '',
        level: 1,
        history: [],
        contentHistory: []
    };
    state.paragraphs.push(newParagraph);
    switchParagraph(state.paragraphs.length - 1);
}

// ============================================
// Drag and Drop Functionality
// ============================================

let dragState = {
    draggedIndex: null,
    draggedElement: null
};

function initDragAndDrop() {
    const items = document.querySelectorAll('.paragraph-item');

    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    dragState.draggedIndex = parseInt(e.currentTarget.dataset.index);
    dragState.draggedElement = e.currentTarget;

    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    if (targetIndex !== dragState.draggedIndex) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const targetIndex = parseInt(e.currentTarget.dataset.index);

    if (dragState.draggedIndex !== null && dragState.draggedIndex !== targetIndex) {
        // 保存当前编辑内容
        state.paragraphs[state.currentIndex].content = elements.editorTextarea.value;

        // 重新排序数组
        const draggedParagraph = state.paragraphs[dragState.draggedIndex];
        state.paragraphs.splice(dragState.draggedIndex, 1);
        state.paragraphs.splice(targetIndex, 0, draggedParagraph);

        // 更新当前索引
        if (state.currentIndex === dragState.draggedIndex) {
            state.currentIndex = targetIndex;
        } else if (dragState.draggedIndex < state.currentIndex && targetIndex >= state.currentIndex) {
            state.currentIndex--;
        } else if (dragState.draggedIndex > state.currentIndex && targetIndex <= state.currentIndex) {
            state.currentIndex++;
        }

        updateAll();
    }

    e.currentTarget.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');

    // 清除所有拖拽样式
    document.querySelectorAll('.paragraph-item').forEach(item => {
        item.classList.remove('drag-over', 'dragging');
    });

    dragState.draggedIndex = null;
    dragState.draggedElement = null;
}

// ============================================
// Panel Resize Functionality
// ============================================

let resizeState = {
    isResizing: false,
    startX: 0,
    startWidth: 0
};

function initPanelResize() {
    elements.resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
}

function startResize(e) {
    resizeState.isResizing = true;
    resizeState.startX = e.clientX;

    // Get the current width of the feedback panel
    const feedbackRect = elements.feedbackPanel.getBoundingClientRect();
    resizeState.startWidth = feedbackRect.width;

    // Add dragging class for visual feedback
    elements.resizeHandle.classList.add('dragging');

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';

    e.preventDefault();
}

function doResize(e) {
    if (!resizeState.isResizing) return;

    // Calculate the change in mouse position
    const deltaX = resizeState.startX - e.clientX;

    // Calculate new width for feedback panel
    const newWidth = resizeState.startWidth + deltaX;

    // Get the container width to calculate percentages
    const containerRect = elements.feedbackPanel.parentElement.getBoundingClientRect();
    const containerWidth = containerRect.width;

    // Calculate the percentage of the new feedback panel width
    const feedbackWidthPercent = (newWidth / containerWidth) * 100;

    // Calculate the percentage of the editor panel width
    // Editor width = 100% - feedback width - handle width (8px)
    const handleWidthPercent = (8 / containerWidth) * 100;
    const editorWidthPercent = 100 - feedbackWidthPercent - handleWidthPercent;

    // Apply constraints: editor should be between minEditorPercent and maxEditorPercent
    // This means feedback should be between (100 - maxEditorPercent) and (100 - minEditorPercent)
    const minEditorPercent = 30;
    const maxEditorPercent = 75;

    if (editorWidthPercent < minEditorPercent) {
        // Editor is too small, set to minimum
        const maxFeedbackPercent = 100 - minEditorPercent - handleWidthPercent;
        elements.feedbackPanel.style.width = `${maxFeedbackPercent}%`;
        elements.editorPanel.style.flex = 'none';
        elements.editorPanel.style.width = `${minEditorPercent}%`;
    } else if (editorWidthPercent > maxEditorPercent) {
        // Editor is too large, set to maximum
        const minFeedbackPercent = 100 - maxEditorPercent - handleWidthPercent;
        elements.feedbackPanel.style.width = `${minFeedbackPercent}%`;
        elements.editorPanel.style.flex = 'none';
        elements.editorPanel.style.width = `${maxEditorPercent}%`;
    } else {
        // Within valid range
        elements.feedbackPanel.style.width = `${feedbackWidthPercent}%`;
        elements.editorPanel.style.flex = 'none';
        elements.editorPanel.style.width = `${editorWidthPercent}%`;
    }

    e.preventDefault();
}

function stopResize(e) {
    if (!resizeState.isResizing) return;

    resizeState.isResizing = false;
    elements.resizeHandle.classList.remove('dragging');
    document.body.style.userSelect = '';
}

// ============================================
// Level Management
// ============================================

function changeLevel(delta) {
    const paragraph = getCurrentParagraph();
    const newLevel = paragraph.level + delta;

    if (newLevel >= 1 && newLevel <= 5) {
        paragraph.level = newLevel;
        updateLevelIndicator();
    }
}

// ============================================
// Version History Management
// ============================================

function saveContentVersion(type) {
    const paragraph = getCurrentParagraph();
    const content = elements.editorTextarea.value.trim();

    // Don't save if content is empty
    if (!content) return;

    // Create version object
    const version = {
        id: generateId(),
        type: type, // 'manual' (Ctrl+S) or 'feedback' (咨询按钮)
        content: content,
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleString()
    };

    // Initialize contentHistory if it doesn't exist
    if (!paragraph.contentHistory) {
        paragraph.contentHistory = [];
    }

    // Add to beginning of array (newest first)
    paragraph.contentHistory.unshift(version);

    // Keep only last 10 versions
    if (paragraph.contentHistory.length > 10) {
        paragraph.contentHistory = paragraph.contentHistory.slice(0, 10);
    }
}

function openHistoryModal() {
    const paragraph = getCurrentParagraph();

    // Save current content before opening
    paragraph.content = elements.editorTextarea.value;

    // Reset selection
    state.selectedHistoryIndex = null;

    // Show modal
    elements.historyModal.classList.add('active');

    // Render history list
    renderHistoryList();
}

function closeHistoryModal() {
    elements.historyModal.classList.remove('active');
    state.selectedHistoryIndex = null;
}

function renderHistoryList() {
    const paragraph = getCurrentParagraph();
    const history = paragraph.contentHistory || [];

    if (history.length === 0) {
        elements.historyList.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">📭</div>
                <p>No version history yet.<br>Save versions with Ctrl+S or by clicking feedback buttons.</p>
            </div>
        `;
        elements.historyTextarea.value = '';
        elements.historyContentTitle.textContent = 'No versions available';
        elements.copyHistoryContent.disabled = true;
        return;
    }

    const html = history.map((version, index) => {
        const typeLabel = version.type === 'manual' ? 'Manual Save' : 'Feedback Save';
        const preview = version.content.substring(0, 50) + (version.content.length > 50 ? '...' : '');

        return `
            <div class="history-item ${state.selectedHistoryIndex === index ? 'active' : ''}"
                 data-index="${index}">
                <div class="history-item-type">${typeLabel}</div>
                <div class="history-item-time">${version.displayTime}</div>
                <div class="history-item-preview">${preview}</div>
            </div>
        `;
    }).join('');

    elements.historyList.innerHTML = html;

    // Add click handlers
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            selectHistoryVersion(index);
        });
    });

    elements.copyHistoryContent.disabled = false;
}

function selectHistoryVersion(index) {
    const paragraph = getCurrentParagraph();
    const history = paragraph.contentHistory || [];

    if (index < 0 || index >= history.length) return;

    state.selectedHistoryIndex = index;
    const version = history[index];

    // Update UI
    elements.historyTextarea.value = version.content;
    elements.historyContentTitle.textContent = `Version: ${version.displayTime}`;

    // Update active state
    document.querySelectorAll('.history-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

function copyHistoryContent() {
    const text = elements.historyTextarea.value;

    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const originalText = elements.copyHistoryContent.textContent;
        elements.copyHistoryContent.textContent = '✓ Copied!';
        setTimeout(() => {
            elements.copyHistoryContent.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// ============================================
// Font Size Management
// ============================================

function updateEditorFontSize() {
    elements.editorTextarea.style.fontSize = `${state.editorFontSize}px`;
    elements.lineNumbers.style.fontSize = `${state.editorFontSize}px`;
    elements.fontSizeLabel.textContent = `${state.editorFontSize}px`;
}

function increaseFontSize() {
    if (state.editorFontSize < 24) { // Maximum 24px
        state.editorFontSize += 1;
        updateEditorFontSize();
    }
}

function decreaseFontSize() {
    if (state.editorFontSize > 10) { // Minimum 10px
        state.editorFontSize -= 1;
        updateEditorFontSize();
    }
}

// ============================================
// Feedback Generation (Simulated Backend)
// ============================================

function addUserMessage(text) {
    const paragraph = getCurrentParagraph();
    paragraph.history.push({
        sender: 'user',
        text: text,
        timestamp: getTimestamp()
    });
    updateFeedbackChat();
}

function addSystemMessage(text) {
    const paragraph = getCurrentParagraph();
    paragraph.history.push({
        sender: 'system',
        text: text,
        timestamp: getTimestamp()
    });
    updateFeedbackChat();
}

function addFeedbackCard(html) {
    const paragraph = getCurrentParagraph();
    paragraph.history.push({
        type: 'feedback-card',
        html: html,
        timestamp: getTimestamp()
    });
    updateFeedbackChat();
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    elements.feedbackChat.appendChild(indicator);
    elements.feedbackChat.scrollTop = elements.feedbackChat.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// ============================================
// Level-Specific Feedback Generators
// ============================================

function generatePEELFeedback(content) {
    // Simulated PEEL detection
    const hasPoint = content.length > 50 && /^[A-Z]/.test(content.trim());
    const hasEvidence = /for example|for instance|such as|according to|data shows|research|study|percent|%/i.test(content);
    const hasExplanation = /this means|this shows|therefore|thus|as a result|consequently|in other words/i.test(content);
    const hasLink = /in conclusion|to sum up|overall|finally|in summary|therefore/i.test(content);

    const items = [
        {
            label: 'P - Point (Topic Sentence)',
            detected: hasPoint,
            successText: 'A topic sentence has been detected at the beginning of your paragraph.',
            failText: 'No clear topic sentence detected. Consider starting with a clear statement of your main argument.'
        },
        {
            label: 'E - Evidence (Supporting Details)',
            detected: hasEvidence,
            successText: 'Evidence has been detected in your paragraph.',
            failText: 'No evidence detected. Consider adding examples, quotations, or data to support your point.'
        },
        {
            label: 'E - Explanation (Analysis)',
            detected: hasExplanation,
            successText: 'Explanatory sentences have been detected.',
            failText: 'No explanation detected. Consider adding sentences that explain how your evidence supports your point.'
        },
        {
            label: 'L - Link (Conclusion/Transition)',
            detected: hasLink,
            successText: 'A concluding or linking sentence has been detected.',
            failText: 'No concluding sentence detected. Consider adding a summary or transition to the next paragraph.'
        }
    ];

    const itemsHtml = items.map(item => `
        <div class="feedback-item">
            <div class="feedback-status ${item.detected ? 'success' : 'warning'}">
                ${item.detected ? '✓' : '!'}
            </div>
            <div class="feedback-content">
                <div class="feedback-label">${item.label}</div>
                <div class="feedback-text">${item.detected ? item.successText : item.failText}</div>
            </div>
        </div>
    `).join('');

    return `
        <div class="feedback-card">
            <div class="feedback-card-header">
                <span class="feedback-card-icon">🔍</span>
                <span class="feedback-card-title">PEEL Structure Analysis</span>
            </div>
            ${itemsHtml}
        </div>
    `;
}

function generateEvidenceFeedback(content) {
    const evidenceTypes = [
        {
            type: 'Ev-eg (Example)',
            pattern: /for example|for instance|such as|like|including/i,
            description: 'Concrete examples to illustrate your point'
        },
        {
            type: 'Ev-quo (Quotation)',
            pattern: /according to|".*"|'.*'|stated|claimed|argued|suggests/i,
            description: 'Direct quotes or paraphrases from sources'
        },
        {
            type: 'Ev-dat (Data/Statistics)',
            pattern: /\d+%|\d+ percent|data|statistics|survey|study found|research shows/i,
            description: 'Numerical data or research findings'
        },
        {
            type: 'Ev-reason (Reasoning)',
            pattern: /because|since|due to|the reason|this is why|as a result of/i,
            description: 'Logical reasoning and cause-effect relationships'
        }
    ];

    const detected = evidenceTypes.filter(e => e.pattern.test(content));
    const notDetected = evidenceTypes.filter(e => !e.pattern.test(content));

    const tagsHtml = evidenceTypes.map(e => `
        <span class="evidence-tag ${e.pattern.test(content) ? 'active' : ''}">
            ${e.pattern.test(content) ? '✓' : '○'} ${e.type}
        </span>
    `).join('');

    let suggestionText = '';
    if (detected.length === 0) {
        suggestionText = 'No evidence types were detected. Consider adding examples, quotations, data, or reasoning to strengthen your argument.';
    } else if (detected.length < 3) {
        suggestionText = `Your paragraph primarily relies on ${detected.map(d => d.type).join(' and ')}. To enhance credibility and depth, consider adding ${notDetected.slice(0, 2).map(n => n.type).join(' or ')}.`;
    } else {
        suggestionText = 'Your paragraph uses a diverse range of evidence types, which strengthens your argument.';
    }

    return `
        <div class="feedback-card">
            <div class="feedback-card-header">
                <span class="feedback-card-icon">📊</span>
                <span class="feedback-card-title">Evidence Type Analysis</span>
            </div>
            <div class="feedback-item">
                <div class="feedback-content">
                    <div class="feedback-label">Detected Evidence Types:</div>
                    <div class="evidence-tags">${tagsHtml}</div>
                </div>
            </div>
            <div class="feedback-item">
                <div class="feedback-status ${detected.length >= 2 ? 'success' : 'warning'}">
                    ${detected.length >= 2 ? '💡' : '!'}
                </div>
                <div class="feedback-content">
                    <div class="feedback-label">Metacognitive Prompt</div>
                    <div class="feedback-text">${suggestionText}</div>
                </div>
            </div>
        </div>
    `;
}

function generateConnectorFeedback(content) {
    const connectorTypes = [
        {
            type: 'T-add (Addition)',
            label: 'Addition',
            pattern: /moreover|furthermore|in addition|also|besides|additionally|what's more/i,
            words: []
        },
        {
            type: 'T-cau (Cause/Effect)',
            label: 'Cause/Effect',
            pattern: /because|therefore|thus|consequently|as a result|hence|so|since/i,
            words: []
        },
        {
            type: 'T-seq (Sequence)',
            label: 'Sequence',
            pattern: /first|second|third|finally|then|next|subsequently|meanwhile/i,
            words: []
        },
        {
            type: 'T-adv (Adversative)',
            label: 'Contrast',
            pattern: /however|although|despite|nevertheless|on the other hand|but|yet|while/i,
            words: []
        }
    ];

    // Extract actual connector words found
    connectorTypes.forEach(ct => {
        const matches = content.match(ct.pattern);
        if (matches) {
            ct.words = matches;
        }
    });

    const hasAnyConnector = connectorTypes.some(ct => ct.words.length > 0);

    if (!hasAnyConnector) {
        return `
            <div class="feedback-card">
                <div class="feedback-card-header">
                    <span class="feedback-card-icon">🔗</span>
                    <span class="feedback-card-title">Connector Analysis</span>
                </div>
                <div class="feedback-item">
                    <div class="feedback-status warning">!</div>
                    <div class="feedback-content">
                        <div class="feedback-label">No Connectors Detected</div>
                        <div class="feedback-text">
                            Your paragraph does not appear to use explicit logical connectors.
                            Please review the relationships between your sentences and consider
                            adding connectors for: Addition (moreover, furthermore),
                            Cause/Effect (therefore, because), Sequence (first, then),
                            or Contrast (however, although).
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const groupsHtml = connectorTypes.filter(ct => ct.words.length > 0).map(ct => `
        <div class="connector-group">
            <div class="connector-label">${ct.type}</div>
            <div class="connector-items">
                ${ct.words.map(w => `<span class="connector-item">${w}</span>`).join('')}
            </div>
        </div>
    `).join('');

    return `
        <div class="feedback-card">
            <div class="feedback-card-header">
                <span class="feedback-card-icon">🔗</span>
                <span class="feedback-card-title">Connector Analysis</span>
            </div>
            <div class="feedback-item">
                <div class="feedback-content">
                    <div class="feedback-label">Detected Connector Types:</div>
                    ${groupsHtml}
                </div>
            </div>
            <div class="feedback-item">
                <div class="feedback-status success">💡</div>
                <div class="feedback-content">
                    <div class="feedback-label">Metacognitive Prompt</div>
                    <div class="feedback-text">
                        Please evaluate whether these connectors accurately reflect the logical
                        relationships between your sentences. If you find a mismatch between
                        the connector type and your intended meaning, consider revising.
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateLanguageFeedback(content) {
    // Simulated language diagnostics
    const diagnostics = [
        {
            category: 'Grammar Accuracy',
            icon: '📝',
            issues: [],
            suggestions: []
        },
        {
            category: 'Vocabulary Appropriateness',
            icon: '📚',
            issues: [],
            suggestions: []
        },
        {
            category: 'Sentence Variety',
            icon: '✍️',
            issues: [],
            suggestions: []
        }
    ];

    // Simple heuristic checks
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const avgLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length;

    // Check for informal words
    const informalWords = content.match(/\b(very|really|a lot|thing|stuff|get|got)\b/gi);
    if (informalWords && informalWords.length > 0) {
        diagnostics[1].issues.push(`Informal words detected: "${informalWords.slice(0, 3).join('", "')}"`);
        diagnostics[1].suggestions.push('Consider replacing informal words with more academic alternatives (e.g., "very big" → "substantial").');
    }

    // Check sentence variety
    if (avgLength < 10) {
        diagnostics[2].issues.push('Sentences appear relatively short.');
        diagnostics[2].suggestions.push('Consider combining some sentences using subordinate clauses for variety.');
    } else if (avgLength > 25) {
        diagnostics[2].issues.push('Some sentences may be too long.');
        diagnostics[2].suggestions.push('Consider breaking up very long sentences for clarity.');
    }

    // Check for common errors (simplified)
    if (/\s{2,}/.test(content)) {
        diagnostics[0].issues.push('Multiple consecutive spaces detected.');
        diagnostics[0].suggestions.push('Remove extra spaces between words.');
    }

    const itemsHtml = diagnostics.map(d => {
        const hasIssues = d.issues.length > 0;
        return `
            <div class="feedback-item">
                <div class="feedback-status ${hasIssues ? 'warning' : 'success'}">
                    ${d.icon}
                </div>
                <div class="feedback-content">
                    <div class="feedback-label">${d.category}</div>
                    <div class="feedback-text">
                        ${hasIssues
                            ? d.issues.map(i => `• ${i}`).join('<br>') + '<br><strong>Suggestion:</strong> ' + d.suggestions.join(' ')
                            : 'No significant issues detected in this area.'}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="feedback-card">
            <div class="feedback-card-header">
                <span class="feedback-card-icon">✏️</span>
                <span class="feedback-card-title">Language Diagnosis</span>
            </div>
            ${itemsHtml}
            <div class="feedback-item">
                <div class="feedback-status success">💡</div>
                <div class="feedback-content">
                    <div class="feedback-label">Student Task</div>
                    <div class="feedback-text">
                        Review the suggestions above and decide whether to accept the recommended changes.
                        Remember that you have the final say in your writing choices.
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateFinalSummary(content, history) {
    // Count what was detected across all levels
    const achievements = [];

    // Check PEEL elements
    if (/^[A-Z]/.test(content.trim()) && content.length > 50) achievements.push('a clear topic sentence');
    if (/for example|for instance|such as|according to/i.test(content)) achievements.push('supporting evidence');
    if (/this means|therefore|thus|consequently/i.test(content)) achievements.push('explanatory analysis');
    if (/in conclusion|overall|finally/i.test(content)) achievements.push('a concluding statement');
    if (/moreover|furthermore|however|therefore/i.test(content)) achievements.push('logical connectors');

    const achievementText = achievements.length > 0
        ? achievements.join(', ')
        : 'foundational writing elements';

    return `
        <div class="feedback-card" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-color: #F59E0B;">
            <div class="feedback-card-header">
                <span class="feedback-card-icon">🎯</span>
                <span class="feedback-card-title">Comprehensive Feedback Summary</span>
            </div>
            <div class="feedback-item">
                <div class="feedback-status success">🌟</div>
                <div class="feedback-content">
                    <div class="feedback-label">What You've Accomplished</div>
                    <div class="feedback-text">
                        Your paragraph demonstrates several key writing elements, including: ${achievementText}.
                        You have established a basic paragraph structure that communicates your ideas.
                    </div>
                </div>
            </div>
            <div class="feedback-item">
                <div class="feedback-status success">📈</div>
                <div class="feedback-content">
                    <div class="feedback-label">Areas for Continued Focus</div>
                    <div class="feedback-text">
                        Continue to pay attention to the connections between elements within your paragraph,
                        such as the logical relationship between evidence and your main point, and the
                        structural correspondence between your opening and closing.
                    </div>
                </div>
            </div>
            <div class="feedback-item">
                <div class="feedback-status success">💪</div>
                <div class="feedback-content">
                    <div class="feedback-label">Encouragement</div>
                    <div class="feedback-text">
                        Writing is a process of continuous revision and refinement. The fact that you have
                        carefully reviewed the feedback and considered how to improve is already commendable.
                        Maintain an attitude of exploration and revision—this is a powerful driver of writing
                        progress. Keep up the great work!
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Action Handler
// ============================================

async function handleAction(action) {
    if (state.isProcessing) return;

    const paragraph = getCurrentParagraph();
    const content = elements.editorTextarea.value.trim();

    // Save content
    paragraph.content = content;

    if (!content) {
        addSystemMessage('Please enter a paragraph before requesting feedback.');
        return;
    }

    // Save version before processing feedback
    saveContentVersion('feedback');

    state.isProcessing = true;

    // Add user message
    const actionLabels = {
        'check-peel': 'Check PEEL Structure',
        'check-evidence': 'Analyze Evidence Types',
        'check-connectors': 'Check Connectors',
        'check-language': 'Language Diagnosis',
        'final-summary': 'Get Final Summary'
    };
    addUserMessage(actionLabels[action] || action);

    // Show typing indicator
    showTypingIndicator();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    hideTypingIndicator();

    // Generate appropriate feedback
    let feedbackHtml = '';
    switch (action) {
        case 'check-peel':
            feedbackHtml = generatePEELFeedback(content);
            break;
        case 'check-evidence':
            feedbackHtml = generateEvidenceFeedback(content);
            break;
        case 'check-connectors':
            feedbackHtml = generateConnectorFeedback(content);
            break;
        case 'check-language':
            feedbackHtml = generateLanguageFeedback(content);
            break;
        case 'final-summary':
            feedbackHtml = generateFinalSummary(content, paragraph.history);
            break;
    }

    addFeedbackCard(feedbackHtml);

    state.isProcessing = false;
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Sidebar toggle
    elements.menuBtn.addEventListener('click', () => {
        state.sidebarOpen = !state.sidebarOpen;
        elements.sidebar.classList.toggle('collapsed', !state.sidebarOpen);
    });

    elements.sidebarClose.addEventListener('click', () => {
        state.sidebarOpen = false;
        elements.sidebar.classList.add('collapsed');
    });

    // Add paragraph
    elements.addParagraph.addEventListener('click', addNewParagraph);

    // Editor changes
    elements.editorTextarea.addEventListener('input', () => {
        updateLineNumbers();
        getCurrentParagraph().content = elements.editorTextarea.value;
        updateParagraphList();
    });

    // Paragraph navigation
    elements.prevParagraph.addEventListener('click', () => {
        switchParagraph(state.currentIndex - 1);
    });

    elements.nextParagraph.addEventListener('click', () => {
        switchParagraph(state.currentIndex + 1);
    });

    // Level navigation
    elements.prevLevel.addEventListener('click', () => changeLevel(-1));
    elements.nextLevel.addEventListener('click', () => changeLevel(1));

    // Action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action) {
                handleAction(action);
            }
        });
    });

    // Progress step clicks
    document.querySelectorAll('.progress-steps .step').forEach(step => {
        step.addEventListener('click', () => {
            const level = parseInt(step.dataset.level);
            const paragraph = getCurrentParagraph();
            paragraph.level = level;
            updateLevelIndicator();
        });
    });

    // Sync textarea scroll with line numbers
    elements.editorTextarea.addEventListener('scroll', () => {
        elements.lineNumbers.scrollTop = elements.editorTextarea.scrollTop;
    });

    // Font size controls
    elements.increaseFontSize.addEventListener('click', increaseFontSize);
    elements.decreaseFontSize.addEventListener('click', decreaseFontSize);

    // History version controls
    elements.historyBtn.addEventListener('click', openHistoryModal);
    elements.closeHistoryModal.addEventListener('click', closeHistoryModal);
    elements.copyHistoryContent.addEventListener('click', copyHistoryContent);

    // Close modal when clicking outside
    elements.historyModal.addEventListener('click', (e) => {
        if (e.target === elements.historyModal) {
            closeHistoryModal();
        }
    });

    // Keyboard shortcut: Ctrl+S to save version
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveContentVersion('manual');

            // Visual feedback
            const originalText = elements.historyBtn.textContent;
            elements.historyBtn.textContent = '✓ Saved';
            setTimeout(() => {
                elements.historyBtn.textContent = originalText;
            }, 1500);
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.historyModal.classList.contains('active')) {
            closeHistoryModal();
        }
    });
}

// ============================================
// Initialization
// ============================================

function init() {
    initEventListeners();
    initPanelResize();
    updateAll();

    // Set initial content
    elements.editorTextarea.value = getCurrentParagraph().content;
    updateLineNumbers();

    // Set initial font size
    updateEditorFontSize();
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
