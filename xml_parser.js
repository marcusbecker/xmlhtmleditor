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
                    if (e.value !== undefined && e.value.length > 0) {
                        let cdata;
                        if (e.value.indexOf("<") !== -1) {
                            cdata = xmlDoc.createCDATASection(e.value);
                        } else {
                            cdata = xmlDoc.createTextNode(e.value);
                        }

                        tmp.appendChild(cdata);
                    }
                    parent.appendChild(tmp);
                    this._nodeToXml(xmlDoc, tmp, e);
                });
            }
        }
    }

    _xmlToNode(parent, tag, _root) {
        if (tag.tagName) {
            ++this.inId;
            const attrs = [];

            if (tag.attributes) {
                for (let i = 0; i < tag.attributes.length; i++) {
                    const attr = tag.attributes[i];
                    attrs.push({ name: attr.name, value: attr.value });
                }
            }

            if (this._countNodeChild(tag) === 0) {
                let val = '';
                if (tag.childNodes[0] && tag.childNodes[0].nodeValue) {
                    val = tag.childNodes[0].nodeValue;
                }
                _root.next.push({ id: this.inId, name: tag.nodeName, value: val, prev: _root, attrs: attrs });
            } else {
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
        this.iId = 0;
        this.data = [];
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

    copyTag(tagId) {
        const tmp = this.findTag(tagId);
        if (tmp) {
            const cp = { id: ++this.iId, name: tmp.name, prev: tmp.prev, attrs: tmp.attrs, next: [] };
            cp.next = this._copyTagArray(cp, tmp.next);
            let insert = this._findPosition(tmp.id, tmp.prev.next);
            if (insert > -1) {
                tmp.prev.next.splice(insert, 0, cp);
            } else {
                tmp.prev.next.unshift(cp);
            }
            return this.iId;
        }
        return -1;
    }
    _findPosition(id, arr) {
        for (let i = 0; i < arr.length; ++i) {
            if (id === arr[i].id) {
                return i;
            }
        }
        return -1;
    }
    _copyTagArray(parent, arr) {
        if (arr) {
            const cp = [];
            arr.forEach(e => {
                cp.push({ id: ++this.iId, name: e.name, value: e.value, prev: parent, attrs: e.attrs });
                if (e.next) {
                    console.log("TODO deep copy");
                }
            });
            return cp;
        }
    }
    findTag(tagId, data) {
        let tmp = data ? data : this.data;
        if (tagId === tmp.id) {
            return tmp;
        }
        if ((tmp = tmp.next)) {
            for (let i = 0; i < tmp.length; ++i) {
                const e = tmp[i];
                if (tagId === e.id) {
                    return e;
                }
                const found = this.findTag(tagId, e);
                if (found) {
                    return found;
                }
            }
        }
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
                ++this.iId;
                if (e.value !== undefined) {
                    this.res += this._htmlInput(e);
                } else {
                    this.res += this._htmlTitle(e);
                }
                this._nodeToHtml(e.next);
            });
        }
    }

    _encode(text) {
        const textArea = document.createElement('textarea');
        textArea.innerText = text;
        return textArea.innerHTML;
    }
    _htmlTitle(e) {
        const p = e.prev.name ? e.prev.name : '';
        return `<span><h2 id="title_${e.id}" data-name="${e.name}">${e.name} <a href="#" data-id="${e.id}" onclick="return titleClick(this);">[+]</a></h2></span>`;
    }

    _htmlInput(e) {
        const p = e.prev.name ? e.prev.name : 'nop';
        return `<span><p><label>${e.name}: </label><textarea id="inp_${e.prev.id}_${e.id}" class="edit-text" data-id="${e.id}" data-parent="${e.prev.id}" name="${e.name}">${e.value}</textarea></p></span>`;
    }
}