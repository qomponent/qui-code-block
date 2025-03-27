import { LitElement, html, css } from 'lit';
import {EditorState} from "@codemirror/state"
import {EditorView, lineNumbers, keymap, highlightActiveLineGutter, highlightSpecialChars } from "@codemirror/view"
import {defaultKeymap} from "@codemirror/commands"
import { xml } from '@codemirror/lang-xml';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { html as htmlLanguage } from '@codemirror/lang-html';
import { css as cssLanguage } from '@codemirror/lang-css';
import { sass } from '@codemirror/lang-sass';
import { markdown } from '@codemirror/lang-markdown';
import { StreamLanguage } from "@codemirror/language"
import { properties } from './properties.js';
import { asciiArmor } from './asciiarmor.js';
import { powerShell } from './powershell.js';
import { shell } from './shell.js';
import { protobuf } from './protobuf.js';
import { dockerFile } from './dockerfile.js';
import { diff } from './diff.js';
import { basicLight } from './lightTheme.js';
import { basicDark } from './darkTheme.js';

/**
 * Code block UI Component 
 */
class QuiCodeBlock extends LitElement {
    
    static styles = css`
        :host {
            display: block;
            height: 100%;
        }

        #codeMirrorContainer {
            height: 100%;
        }

        slot {
            display:none;
        }
    `;

    static properties = {
        mode: { type: String },
        content: { type: String },
        src: { type: String },
        showLineNumbers: {type: Boolean},
        editable: {type: Boolean},
        value: {type: String, reflect: true },
        theme: {type: String, reflect: true},
        _basicTheme: {type: String, state: true}
    };

    constructor() {
        super();
        this.mode = null;
        this.content = '';
        this.showLineNumbers = false;
        this.editable = false;
        this.value = null;
        this._basicTheme = basicDark; // default
    }

    connectedCallback() {
        super.connectedCallback();
        this._updateSlotContent();
        if(this.src){
            // if mode is not provided, figure is out
            if(!this.mode){
                this.mode = this.src.split('.').pop()?.toLowerCase();
            }
            fetch(this.src).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }            
                return response.text();
            }).then(text => {
                this.content = text;
            }).catch(error => {
                this.content = "Fetch error: " +  error;
            });
        }
        if(this.theme && this.theme==="light"){
            this._basicTheme = basicLight;
        }else{
            this._basicTheme = basicDark;
        }
        const slot = this.shadowRoot.querySelector('slot');
        if (slot) {
            slot.addEventListener('slotchange', () => {
                this._updateSlotContent();
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.editorView) {
          this.editorView.destroy();
        }
    }

    firstUpdated() {
        this._updateSlotContent();
    }

    _updateSlotContent() {
        // See if the content is provided in a slot
        const slotValue = this.shadowRoot.getElementById('slotContent');
        if(slotValue){
            const v = slotValue.assignedNodes()[1];
            if(v && v.textContent){
                this.content = this._removeEmptyLines(v.textContent);
                this._updateContent();
            }
        }

        const codeMirrorContainer = this.shadowRoot.getElementById('codeMirrorContainer');

        this.editorView = new EditorView({
            state: this._createState(),
            readonly: !this.editable,
            parent: codeMirrorContainer
        });        

        this.value = this.editorView.state.doc.toString();
    }

    _createState(){
        
        return EditorState.create({
            doc: this.content,
            extensions: this._createConf()
        });
    }

    _createConf(){
        
        const shiftEnterCommand = (view, event) => {
            event.preventDefault();
            const content = view.state.doc.toString();
            this.dispatchEvent(new CustomEvent('shiftEnter', {
              detail: { content },
              bubbles: true,
              composed: true
            }));
            return true;
        };

        const conf = [
            this._detectMode(), 
            this._basicTheme,
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            EditorView.lineWrapping,
            keymap.of([
                { key: "Shift-Enter", run: shiftEnterCommand },
                ...defaultKeymap
              ]),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const value = update.state.doc.toString();
                    this.value = value;
                        this.dispatchEvent(new CustomEvent('value-changed', {
                        detail: { value },
                        bubbles: true,
                        composed: true
                    }));
                }
            }),
            this.editable ? [] : EditorState.readOnly.of(true)
        ];
        if(this.showLineNumbers){
            conf.push(lineNumbers());
        }

        return conf.flat();
    }
    

    updated(changedProperties) {

        super.updated(changedProperties);

        if (changedProperties.has('theme')) {
            if (this.theme === "light") {
                this._basicTheme = basicLight;
            } else {
                this._basicTheme = basicDark;
            }
            this.editorView.setState(this._createState());
        }

        if ((changedProperties.has('content')) && this.editorView) {
            this._updateContent();
        }
        
        if(changedProperties.has('src')){
            if(this.src){
                // if mode is not provided, figure is out
                if(!this.mode){
                    this.mode = this.src.split('.').pop()?.toLowerCase();
                }
                fetch(this.src).then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }            
                    return response.text();
                }).then(text => {
                    this.content = text;
                    this._updateContent();
                }).catch(error => {
                    this.content = "Fetch error: " +  error;
                    this._updateContent();
                });
            }
        }
    }

    _updateContent(){
        const transaction = this.editorView.state.update({
            changes: {
                from: 0,
                to: this.editorView.state.doc.length,
                insert: this.content,
            },
        });
        this.editorView.dispatch(transaction);
    }

    render() {
        return html`<div id="codeMirrorContainer">
                <slot id="slotContent"></slot>
            </div>`;
    }

    _detectMode() {
        switch (this.mode) {
            case 'js':
                return javascript();
            case 'xml':
                return xml();
            case 'json':
                return json();
            case 'java':
                return java();
            case 'sql':
                return sql();
            case 'yaml':
            case 'yml':
                return yaml();
            case 'html':
            case 'xhtml':
            case 'htm':
                return htmlLanguage();
            case 'css':
                return cssLanguage();
            case 'markdown':
            case 'md':
                return markdown();
            case 'scss':    
            case 'sass':
                return sass();
            case 'asc':
                return StreamLanguage.define(asciiArmor);
            case 'properties':
                return StreamLanguage.define(properties);
            case 'dockerFile':
            case 'dockerfile':
            case 'Dockerfile':
                return StreamLanguage.define(dockerFile);
            case 'ps1':
            case 'psd1':
            case 'psm1':
                return StreamLanguage.define(powerShell);
            case 'protobuf':
            case 'pb':
            case 'txtpb':
            case 'binpb':
                return StreamLanguage.define(protobuf);
            case 'diff':
            case 'difffile':
            case 'patch':
                return StreamLanguage.define(diff);    
            default:
                return StreamLanguage.define(shell);
        }
    }

    _removeEmptyLines(text) {
        // Remove empty lines at the beginning
        text = text.replace(/^\s*\n/, '');
      
        // Remove empty lines at the end
        text = text.replace(/\n\s*$/, '');
      
        return text;
    }

    // This is here for backward compatibility
    populatePrettyJson(json){
        this.content = json;
    }
}

customElements.define('qui-code-block', QuiCodeBlock);
