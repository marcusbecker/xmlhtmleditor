class FileUtil {
    constructor() {
        if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
            alert('ERROR: File APIs are note supported');
        }
    }

    init(inpFileId) {
        document.getElementById(inpFileId).addEventListener('change', this.handle, false);
    }

    handle(evt) {
        const files = evt.target.files;
        // File properties: name, type, size, lastModifiedDate
        for (let i = 0, f; f = files[i]; ++i) {
            console.log(f.name);
        }
    }
}

class FileDragDropUtil extends FileUtil {
    constructor() {
        super();
    }

    init(inpFileId, dropHandle) {
        const dropZone = document.getElementById(inpFileId);
        dropZone.addEventListener('drop', dropHandle, false);
        dropZone.addEventListener('dragover', this.handleDragOver, false);
    }

    handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        // Explicitly show this is a copy.
        evt.dataTransfer.dropEffect = 'copy';
    }
}

class DataConverter {
    constructor() {
        this.data = {};
    }

    resourceToData(text) {
    }

    dataToResource(data) {
    }

    getData() {
        return this.data;
    }

    print() {
        console.log(this.data);
    }
}

class XMLDataConverter extends DataConverter {
    constructor() {
        super();
        this.inId = 0; //internal id
        this.count = 0;
    }

    // Convert xml to data node
    resourceToData(text) {
        this.inId = 0;
        this.count = 0;
        this.data = { name: 'root', next: [] };

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        this._xmlToNode(null, xmlDoc.getRootNode(), this.data);
        // Remove root data
        this.data = this.data.next[0];
        return this.data;
    }

    // Convert data node to xml
    dataToResource(data) {
        let xmlDoc = document.implementation.createDocument(null, "");
        this._nodeToXml(xmlDoc, null, data);
        return xmlDoc;
    }

    _nodeToXml(xmlDoc, parent, data) {
        if (data) {
            if (parent == null) {
                parent = xmlDoc.createElement(data.name);
                xmlDoc.appendChild(parent);
            }

            if (data.attrs) {
                data.attrs.forEach(a => {
                    const tmp = xmlDoc.createAttribute(a.name);
                    tmp.nodeValue = a.value;
                    parent.setAttributeNode(tmp);
                });
            }

            if (data.next) {
                data.next.forEach(e => {
                    const tmp = xmlDoc.createElement(e.name);
                    if (e.value !== undefined) {
                        tmp.textContent = e.value;
                    }
                    parent.appendChild(tmp);
                    this._nodeToXml(xmlDoc, tmp, e);
                });
            }
        }
    }

    _xmlToNode(parent, tag, _root) {
        if (tag.tagName) {
            const attrs = [];

            if (tag.attributes) {
                for (let i = 0; i < tag.attributes.length; i++) {
                    const attr = tag.attributes[i];
                    attrs.push({ name: attr.name, value: attr.value });
                }
            }

            if (this._countNodeChild(tag) === 0) {
                let val = '';
                ++this.count;
                if (tag.childNodes[0] && tag.childNodes[0].nodeValue) {
                    val = tag.childNodes[0].nodeValue;
                }
                _root.next.push({ id: this.count, name: tag.nodeName, value: val, prev: _root, attrs: attrs });
            } else {
                ++this.inId;
                let next = { id: this.inId, name: tag.nodeName, prev: _root, attrs: attrs, next: [] };
                _root.next.push(next);
                _root = next;
            }
        }

        for (let i = 0; i < tag.childNodes.length; ++i) {
            this._xmlToNode(tag.tagName, tag.childNodes[i], _root);
        }
    }

    _countNodeChild(tag) {
        let count = 0;

        if (tag.childNodes) {
            for (let i = 0; i < tag.childNodes.length; ++i) {
                let c = tag.childNodes[i];
                if (c.nodeType == 1) {
                    ++count;
                }
            }
        }
        return count;
    }
}

class HTMLDataConverter extends DataConverter {
    constructor() {
        super();
        this.res = '';
        this.source = null;
    }

    // Convert html to data node
    resourceToData(htmlElement) {
        this.source = htmlElement;

        if (this.source) {
            this._htmlToNode(this.data.next);
            return this.data;
        } else {
            console.log('ERROR: No html element');
        }

        return null;
    }

    // Convert data node to html
    dataToResource(data) {
        this.data = data;
        this._nodeToHtml(data.next);
        const ret = this.res;
        this.res = '';
        return ret;
    }

    _htmlToNode(next) {
        if (next) {
            next.forEach(e => {
                if (e.value !== undefined) {
                    const elId = `#inp_${e.prev.id}_${e.id}`;
                    e.value = this.source.querySelector(elId).value;
                }
                this._htmlToNode(e.next);
            });
        }
    }

    _nodeToHtml(next) {
        if (next) {
            next.forEach(e => {
                if (e.value !== undefined) {
                    this.res += this._htmlInput(e);
                } else {
                    this.res += this._htmlTitle(e);
                }
                this._nodeToHtml(e.next);
            });
        }
    }

    _htmlTitle(e) {
        const p = e.prev.name ? e.prev.name : '';
        return `<span><h2 id="title_${e.id}" data-name="${e.name}">${e.name}</h2></span>`;
    }

    _htmlInput(e) {
        const p = e.prev.name ? e.prev.name : 'nop';
        return `<span><p><label>${e.name}: </label><input id="inp_${e.prev.id}_${e.id}" type="text" data-id="${e.id}" data-parent="${e.prev.id}" name="${e.name}" value="${e.value}" /></p></span>`;
    }
}