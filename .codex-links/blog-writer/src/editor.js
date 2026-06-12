/**
 * CodeMirror 6 编辑器封装
 */
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import {
    defaultKeymap, history, historyKeymap, indentWithTab,
} from '@codemirror/commands';
import {
    syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput,
} from '@codemirror/language';

let editorView = null;
let onChangeCallback = null;

/**
 * 创建编辑器实例
 */
export function createEditor(parentEl, initialContent = '', onChange = null) {
    onChangeCallback = onChange;

    if (editorView) {
        editorView.destroy();
    }

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged && onChangeCallback) {
            onChangeCallback(update.state.doc.toString());
        }
    });

    const customTheme = EditorView.theme({
        '&': {
            height: '100%',
            fontSize: '14.5px',
            fontFamily: '"JetBrains Mono", monospace',
        },
        '.cm-content': {
            padding: '16px 20px',
            caretColor: '#a78bfa',
        },
        '.cm-gutters': {
            backgroundColor: 'transparent',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.2)',
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: '#a78bfa',
        },
        '.cm-activeLine': {
            backgroundColor: 'rgba(167, 139, 250, 0.05)',
        },
        '.cm-selectionBackground': {
            backgroundColor: 'rgba(167, 139, 250, 0.2) !important',
        },
        '&.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(167, 139, 250, 0.25) !important',
        },
        '.cm-cursor': {
            borderLeftColor: '#a78bfa',
            borderLeftWidth: '2px',
        },
        '.cm-scroller': {
            overflow: 'auto',
        },
    });

    const state = EditorState.create({
        doc: initialContent,
        extensions: [
            lineNumbers(),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            history(),
            indentOnInput(),
            bracketMatching(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            oneDark,
            customTheme,
            keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
            updateListener,
            EditorView.lineWrapping,
        ],
    });

    editorView = new EditorView({ state, parent: parentEl });
    return editorView;
}

/**
 * 设置编辑器内容（不触发 onChange）
 */
export function setContent(content) {
    if (!editorView) return;
    const prevCb = onChangeCallback;
    onChangeCallback = null;
    editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: content },
    });
    onChangeCallback = prevCb;
}

/**
 * 获取编辑器内容
 */
export function getContent() {
    if (!editorView) return '';
    return editorView.state.doc.toString();
}

/**
 * 在光标位置插入文本
 */
export function insertAtCursor(text) {
    if (!editorView) return;
    const pos = editorView.state.selection.main.head;
    editorView.dispatch({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length },
    });
    editorView.focus();
}

/**
 * 获取编辑器实例
 */
export function getEditor() {
    return editorView;
}
