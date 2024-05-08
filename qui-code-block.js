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

    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.editorView) {
          this.editorView.destroy();
        }
    }

    firstUpdated() {
        
        // See if the content is provided in a slot
        const slotValue = this.shadowRoot.getElementById('slotContent');
        if(slotValue){
            const v = slotValue.assignedNodes()[1];
            if(v && v.textContent){
                this.content = this._removeEmptyLines(v.textContent);
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
                    this.value = update.state.doc.toString();
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
            case 'pom':
            case 'xml':
                return xml();
            case 'json':
                return json();
            case 'java':
                return java();
            case 'sql':
                return sql();
            case 'yaml':
                return yaml();
            case 'html':
                return htmlLanguage();
            case 'css':
                return cssLanguage();
            case 'markdown':
                return markdown();
            case 'scss':    
            case 'sass':
                return sass();
            case 'asc':
                return StreamLanguage.define(asciiArmor);
            case 'properties':
                return StreamLanguage.define(properties);
            default:
                return StreamLanguage.define(powerShell);
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
