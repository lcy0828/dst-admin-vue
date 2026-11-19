<template>
  <div
    class="config-code-editor-shell"
    :class="{
      'is-readonly': readOnly,
      'is-drag-over': dragOver && !readOnly,
      'has-error-line': errorLine > 0
    }"
    :style="{ '--editor-min-height': minHeight, '--editor-max-height': maxHeight }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div ref="editorHost" class="config-code-editor-host" />
  </div>
</template>

<script>
import { Compartment, EditorState, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, StreamLanguage, bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { properties } from '@codemirror/legacy-modes/mode/properties'
import { search, searchKeymap } from '@codemirror/search'
import {
  Decoration,
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder
} from '@codemirror/view'
import { tags } from '@lezer/highlight'

const luaLanguage = StreamLanguage.define(lua)
const iniLanguage = StreamLanguage.define(properties)

const setErrorLineEffect = StateEffect.define()

const errorLineDecoration = Decoration.line({ class: 'cm-error-line' })

const errorLineField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    let nextLine = null
    for (const effect of tr.effects) {
      if (effect.is(setErrorLineEffect)) {
        nextLine = Number(effect.value) || 0
      }
    }
    if (nextLine === null) {
      return tr.docChanged ? decorations.map(tr.changes) : decorations
    }
    if (nextLine <= 0 || tr.state.doc.lines <= 0) {
      return Decoration.none
    }
    const clampedLine = Math.min(Math.max(1, nextLine), tr.state.doc.lines)
    const lineInfo = tr.state.doc.line(clampedLine)
    const builder = new RangeSetBuilder()
    builder.add(lineInfo.from, lineInfo.from, errorLineDecoration)
    return builder.finish()
  },
  provide: field => EditorView.decorations.from(field)
})

const semanticHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.controlKeyword], color: 'var(--info)', fontWeight: '600' },
  { tag: [tags.bool, tags.atom, tags.null], color: 'var(--info)', fontWeight: '500' },
  { tag: [tags.number, tags.integer, tags.float], color: 'var(--warning)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--success)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--muted-foreground)', fontStyle: 'italic' },
  { tag: [tags.propertyName, tags.definition(tags.variableName), tags.heading], color: 'var(--foreground)', fontWeight: '600' },
  { tag: [tags.invalid], color: 'var(--destructive)', textDecoration: 'underline wavy' }
])

const semanticEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--card)',
    color: 'var(--foreground)',
    fontSize: '13px',
    lineHeight: '1.55'
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    minHeight: 'var(--editor-min-height, 360px)',
    maxHeight: 'var(--editor-max-height, 560px)',
    overflow: 'auto'
  },
  '.cm-content': {
    padding: '10px 0',
    caretColor: 'var(--foreground)'
  },
  '.cm-line': {
    padding: '0 12px'
  },
  '.cm-gutters': {
    backgroundColor: 'color-mix(in srgb, var(--muted) 65%, var(--card))',
    color: 'var(--muted-foreground)',
    borderRight: '1px solid var(--border)',
    userSelect: 'none'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 85%, transparent)',
    color: 'var(--foreground)'
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--muted) 45%, transparent)'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--info) 24%, transparent)'
  },
  '.cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 22%, transparent)'
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--info) 22%, transparent)',
    outline: '1px solid color-mix(in srgb, var(--info) 55%, transparent)'
  },
  '.cm-error-line': {
    backgroundColor: 'color-mix(in srgb, var(--destructive) 16%, transparent) !important',
    boxShadow: 'inset 3px 0 0 var(--destructive)'
  },
  '.cm-panels': {
    backgroundColor: 'var(--muted)',
    color: 'var(--foreground)',
    borderBottom: '1px solid var(--border)'
  },
  '.cm-search': {
    padding: '6px 10px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px'
  },
  '.cm-textfield': {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'calc(var(--radius) - 2px)',
    padding: '3px 8px'
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'calc(var(--radius) - 2px)',
    padding: '3px 8px',
    cursor: 'pointer'
  },
  '.cm-placeholder': {
    color: 'var(--muted-foreground)'
  }
})

function resolveLanguageExtension(lang) {
  return lang === 'ini' ? iniLanguage : luaLanguage
}

export default {
  name: 'ConfigCodeEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'lua'
    },
    readOnly: {
      type: Boolean,
      default: false
    },
    errorLine: {
      type: Number,
      default: 0
    },
    errorColumn: {
      type: Number,
      default: 0
    },
    placeholder: {
      type: String,
      default: ''
    },
    minHeight: {
      type: String,
      default: '360px'
    },
    maxHeight: {
      type: String,
      default: '560px'
    },
    ariaLabel: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'import-file'],
  data() {
    return {
      dragOver: false
    }
  },
  watch: {
    modelValue(nextValue) {
      if (!this.view) return
      const normalized = String(nextValue ?? '')
      const current = this.view.state.doc.toString()
      if (normalized === current) return
      this.applyingExternalValue = true
      try {
        this.view.dispatch({
          changes: { from: 0, to: current.length, insert: normalized }
        })
      } finally {
        this.applyingExternalValue = false
      }
      if (this.errorLine > 0) {
        this.syncErrorLine(this.errorLine, false)
      }
    },
    language(nextLanguage) {
      if (!this.view) return
      this.view.dispatch({
        effects: this.languageCompartment.reconfigure(resolveLanguageExtension(nextLanguage))
      })
    },
    readOnly(nextReadOnly) {
      if (!this.view) return
      this.view.dispatch({
        effects: this.readOnlyCompartment.reconfigure([
          EditorState.readOnly.of(Boolean(nextReadOnly)),
          EditorView.editable.of(!nextReadOnly)
        ])
      })
    },
    placeholder(nextPlaceholder) {
      if (!this.view) return
      this.view.dispatch({
        effects: this.placeholderCompartment.reconfigure(nextPlaceholder ? cmPlaceholder(nextPlaceholder) : [])
      })
    },
    errorLine(nextLine) {
      this.syncErrorLine(nextLine, nextLine > 0)
    },
    errorColumn() {
      if (this.errorLine > 0) {
        this.syncErrorLine(this.errorLine, true)
      }
    }
  },
  mounted() {
    this.languageCompartment = new Compartment()
    this.readOnlyCompartment = new Compartment()
    this.placeholderCompartment = new Compartment()
    this.applyingExternalValue = false

    const state = EditorState.create({
      doc: String(this.modelValue ?? ''),
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        search({ top: true }),
        keymap.of([
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap
        ]),
        semanticEditorTheme,
        syntaxHighlighting(semanticHighlightStyle),
        errorLineField,
        this.languageCompartment.of(resolveLanguageExtension(this.language)),
        this.readOnlyCompartment.of([
          EditorState.readOnly.of(Boolean(this.readOnly)),
          EditorView.editable.of(!this.readOnly)
        ]),
        this.placeholderCompartment.of(this.placeholder ? cmPlaceholder(this.placeholder) : []),
        ...(this.ariaLabel ? [EditorView.contentAttributes.of({ 'aria-label': this.ariaLabel })] : []),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this.applyingExternalValue) {
            this.$emit('update:modelValue', update.state.doc.toString())
          }
        })
      ]
    })

    this.view = new EditorView({
      state,
      parent: this.$refs.editorHost
    })

    if (this.errorLine > 0) {
      this.syncErrorLine(this.errorLine, true)
    }
  },
  beforeUnmount() {
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
  },
  methods: {
    focus() {
      this.view?.focus()
    },
    scrollToLine(lineNumber, columnNumber = 1) {
      if (!this.view || !lineNumber || lineNumber <= 0) return
      const doc = this.view.state.doc
      if (doc.lines <= 0) return
      const clampedLine = Math.min(Math.max(1, Number(lineNumber) || 1), doc.lines)
      const lineInfo = doc.line(clampedLine)
      const colOffset = Math.max(0, Math.min((Number(columnNumber) || 1) - 1, lineInfo.length))
      const pos = lineInfo.from + colOffset
      this.view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' })
      })
    },
    syncErrorLine(lineNumber, scrollIntoView = false) {
      if (!this.view) return
      const normalized = Number(lineNumber) || 0
      this.view.dispatch({
        effects: setErrorLineEffect.of(normalized)
      })
      if (scrollIntoView && normalized > 0) {
        this.scrollToLine(normalized, this.errorColumn || 1)
      }
    },
    handleDragOver(event) {
      if (this.readOnly) return
      if (event.dataTransfer?.types?.includes('Files')) {
        this.dragOver = true
      }
    },
    handleDragLeave() {
      this.dragOver = false
    },
    handleDrop(event) {
      this.dragOver = false
      if (this.readOnly) return
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        this.$emit('import-file', file)
      }
    }
  }
}
</script>

<style scoped>
.config-code-editor-shell {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.config-code-editor-shell:focus-within {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 20%, transparent);
}

.config-code-editor-shell.has-error-line {
  border-color: color-mix(in srgb, var(--destructive) 65%, var(--border));
}

.config-code-editor-shell.is-drag-over {
  border-color: var(--info);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--info) 28%, transparent);
}

.config-code-editor-shell.is-readonly {
  opacity: 0.92;
}

.config-code-editor-host {
  width: 100%;
  min-width: 0;
}
</style>
