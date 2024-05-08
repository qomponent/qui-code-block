# qui-code-block

The code block UI component is based on codemirror 6, wrapped in a Lit webcomponent.

## Installation

```bash
npm i @qomponent/qui-code-block
```

## Usage

```javascript
import '@qomponent/qui-code-block';
```

```html
<qui-code-block mode="properties" theme="dark">
      <slot>
foo = bar
      </slot>
    </qui-code-block>
```

### Modes:

 - properties
 - js
 - java
 - xml
 - json
 - yaml
 - sql
 - html
 - css
 - sass
 - markdown

### Linenumber

Add `showLineNumbers` attribute. Example:

```html
<qui-code-block mode="properties" theme="dark" showLineNumbers>
      <slot>
foo = bar
      </slot>
    </qui-code-block>
```

### Editable

Add `editable` attribute. Example:

```html
<qui-code-block id="code" mode="properties" theme="dark" value='${this._value}' editable>
      <slot>
foo = bar
      </slot>
    </qui-code-block>
```

You can get the value at any time by looking at the value attribute that you set (it's reflective) or you 
can add a listener `shiftEnter` that will contain the new value in `event.detail.content` when Shift-Enter is pressed.

```javascript
let newValue = this.shadowRoot.getElementById('code').getAttribute('value');
```

### Theme

Add attribute `theme`. Value can be `dark` or `light`;

## Example

To run the example:

```bash
npm install
npm start
```


Then go to [http://localhost:8080/example](http://localhost:8080/example)

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[Apache 2](http://www.apache.org/licenses/LICENSE-2.0)
