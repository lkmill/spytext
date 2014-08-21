var Spytext = function(element, config) {
	var that = this;
	this.fields = [];
	//this.currentField = null;
	// holds the active, if any, field
	this.field = null;
	this.element = null;
	this.snapback = null;
	this.selectron = null;
	this.buttons = [];
	this.toolbar = null;
	_.each(this.events.doc, function(func, name) {
		document.bind(name, func, that);
	});
	this.mousedown = false;
	if(element) {
		var toolbar = element.O('[spytext-toolbar], .spytext-toolbar');
		if(toolbar) this.toolbar = new SpytextToolbar(toolbar, { preset: 'standard' });
		element.M('[spytext-field], .spytext-field').each(function() {
			that.addField(this, { preset: 'full' });
		});
		element.M('[st-button-type]').each(function() {
			that.addButton(this, { preset: this.attr('st-button-type') });

		});
	}
};
Spytext.prototype = {
	setCurrentField: function(field) {
		if(this.fields.indexOf(field) > -1) {
			this.field = field;
			this.element = field.element;
			this.snapback = field.snapback;
			this.selectron = field.selectron;
			// TODO activate buttons
		} else {
			this.unsetCurrentField();
		}
	},
	unsetCurrentField: function() {
		this.field = this.element = this.snapback = this.selectron = null;
		// TODO deactivate buttons
	},
	events: {
		doc: {
			mouseup: function(e) {
				if(this.mousedown && this.field) {
					this.snapback.register();
				}
				this.mousedown = false;
			}
		}
	},
	actions: {
		align: function(options) {

			var containedChildren = this.selectron.contained(1,1);
			containedChildren.each(function() {
				if(!this.matches('ul, ol')) this.css('text-align', options.alignment);
			});
		},
		block: function(options) {
			function block(node, insertBefore) {
				insertBefore = insertBefore || node;
				var tmp = wrapper.clone();
				insertBefore.before(tmp);
				while(node.firstChild) {
					tmp.append(node.firstChild);
				}
				node.vanish();
				blocks.push(tmp);
			}
			var that = this;
			var positron = this.selectron.get(null, true);
			console.log(positron);
			var wrapper = O('<' + options.tag + '></' + options.tag + '>');

			var blocks = [];
			this.selectron.contained(1, 1).each(function(){
				var child = this;
				if(this.nodeName === 'UL' || this.nodeName === 'OL') {
					var li = this.offspring('li');
					var containedLi = that.selectron.contained(li);
					var startIndex = li.indexOf(containedLi[0]);
					containedLi.each(function() {
						block(this, child);
					});

					if(!this.firstChild) this.vanish();
					else if(startIndex > 0) {
						var bottomList = O('<' + this.tagName + '><' + this.tagName + '/>');
						while(startIndex < this.childNodes.length) {
							this.after(bottomList);
							bottomList.prepend(this.lastChild);
						}
						this.after(M(blocks));
					}
				} else {
					block(this);
				}
			});
			positron.restore();
		},
		list: function(options){
			var that = this;
			var tags = {
				ordered: 'OL',
				unordered: 'UL'
			};
			var tagName = tags[options.type];
			var list = O('<' + tagName + '></' + tagName + '>');
			var positron = this.selectron.get(null, true);
			var containedChildren = this.selectron.contained(1, 1);
			containedChildren[0].before(list);
			containedChildren.each(function(){
				if(this.nodeName === 'UL' || this.nodeName === 'OL') {
					if(containedChildren.length === 1 && this.tagName === tagName) return;
					var li = this.offspring('li');
					var containedLi = that.selectron.contained(li);
					var startIndex = li.indexOf(containedLi[0]);
					containedLi.each(function() {
							list.append(this);
					});

					if(!this.firstChild) this.vanish();
					else if(startIndex > 0) {
						var bottomList = O('<' + this.tagName + '><' + this.tagName + '/>');
						while(startIndex < this.childNodes.length) {
							this.after(bottomList);
							bottomList.prepend(this.lastChild);
						}
						this.after(list);
					}
				} else {
					var listItem = O('<li></li>');
					list.append(listItem);
					while(this.firstChild) {
						listItem.append(this.firstChild);
					}
					list.append(listItem);
					this.vanish();
				}
			});
			positron.restore();
		},
		indent: function(){
		},
		format: function(options){
			var tags = {
				underline: 'U',
				bold: 'B'
			};
			var wrapper = options.container ? O(options.container) : O('<' + tags[options.command] + '></' + tags[options.command] + '>');
			var positron = this.selectron.get(null, true);
			// NodeList converted to Array to that we can splice it if needed
			var containedTextNodes = this.selectron.contained(3).toArray();
			var rng = this.selectron.range();
			if(rng.endOffset < rng.endContainer.textContent.length) {
				node = rng.endContainer;

				while(node.firstChild && node.nodeType !== 3) node = node.firstChild;

				if(node) node.splitText(rng.endOffset);
			}
			if(rng.startOffset > 0) {
				node = rng.startContainer;

				while(node && node.nodeType !== 3) node = node.firstChild;

				if(node) containedTextNodes.splice(0, 1, node.splitText(rng.startOffset));
			}
			M(containedTextNodes).wrap(wrapper);
			this.selectron.contained(1, 1).tidy(wrapper.tagName);
			positron.restore();
		},
		link: function(attribute) {
			var sel = window.getSelection();
			var node = sel.focusNode.parentNode;
			if (node.tagName.toLowerCase() !== 'a') {
				node = sel.anchorNode.parentNode;
				if (node.tagName.toLowerCase() !== 'a') {
					node = null;
				}
			}

			var href = 'http://';
			if (node) {
				var range = document.createRange();
				range.selectNodeContents(node);
				href = node.attributeibutes.href.value;
				sel.removeAllRanges();
				sel.addRange(range);
			}
			var result = prompt('Link address:', href);

			if (result !== '') {
				document.execCommand('createLink', null, result);
			} else {
				document.execCommand('unlink');
			}
		},
		paste: function(dataTransfer) {
			var str = dataTransfer.getData('Text');
			str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+$/g, '').replace(/[\n\r]+/g, '\n');
			document.execCommand('insertText', null, str);
		},
		removeFormat: function() {
			console.log('hello');
			document.execCommand('removeFormat');
		}
	},
	addButton: function(element, config) {
		var button = new SpytextButton(element, config, this);
		this.buttons.push(button);
		return button;
	},
	addField: function(element, config) {
		var field = new SpytextField(this, element, config);
		this.fields.push(field);
		return field;
	},
	execute: function(action, options) {
		var that = this;
		this.selectron.normalize();
		this.snapback.register();
		if(this.actions[action]) {
			this.actions[action].call(this, options);
			setTimeout(function() {
				that.snapback.register();
			}, 100);
		}
	}
};
var SpytextButton = function(element, config, spytext) {
	this.spytext = spytext;
	this.config = typeof config.preset === 'string' ? _.merge(this.presets[config.preset], config) : config;
	this.element = element;
	this.element.bind('click', this.events.click, this);
};
SpytextButton.prototype = {
	events: {
		click: function(e) {
			e.preventDefault();

			this.spytext.execute(this.config.action, this.config.options);
		}
	},
	presets: {
		alignLeft: { title: 'Align Left', action: 'align', options: { alignment: 'left' }},
		alignRight: { title: 'Align Right', action: 'align', options: { alignment: 'right' }},
		alignCenter: { title: 'Align Center', action: 'align', options: { alignment: 'center' }},
		alignJustify: { title: 'Align Justify', action: 'align', options: { alignment: 'justify' }},
		bold: { title: 'Bold', action: 'format', options: { command: 'bold' }},
		strikeThrough: { title: 'Strike Through', action: 'format', options: { command: 'strikeThrough' }},
		underline: { title: 'Underline', action: 'format', options: { command: 'italic' }},
		italic: { title: 'Italic', action: 'format', options: { command: 'bold' }},
		removeFormat: { action: 'removeFormat' },
		typeHeading1: { title: 'Heading 1', action: 'block', options: { tag: 'H1' }},
		typeHeading2: { title: 'Heading 1', action: 'block', options: { tag: 'H2' }},
		typeHeading3: { title: 'Heading 1', action: 'block', options: { tag: 'H3' }},
		typeHeading4: { title: 'Heading 1', action: 'block', options: { tag: 'H4' }},
		typeHeading5: { title: 'Heading 1', action: 'block', options: { tag: 'H5' }},
		typeHeading6: { title: 'Heading 1', action: 'block', options: { tag: 'H6' }},
		typeParagraph: { title: 'Heading 1', action: 'block', options: { tag: 'P' }},
		orderedList: { title: 'Ordered List', action: 'list', options: { type: 'ordered' }},
		unorderedList: { title: 'Unordered List', action: 'list', options: { type: 'unordered' }},
	}
};
var SpytextToolbar = function(element, config) {
	var that = this;
	this.config = typeof config.preset === 'string' ? _.merge(this.presets[config.preset], config) : config;
	this.element = element;
	_.each(this.events, function(func, name) {
		that.element.bind(name, func, that);
	});
};
SpytextToolbar.prototype = {
	presets: {
		standard: {
			buttonGroups: [
				{ name: 'block', buttons: ['typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6', 'typeParagraph']},
				{ name: 'format', buttons: ['bold', 'italic', 'underline', 'strikeThrough', 'removeFormat']},
				{ name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
				{ name: 'list', buttons: ['unorderedList', 'orderedList']}
			]
		},
		format: {
			buttonGroups: [
				{ name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']},
			]
		}
	},
	events: {
		mousedown: function(e) {
			// this is needed to prevent toolbar from stealing focus
			e.preventDefault();
		}
	}
};
var SpytextField = function(spytext, element, config) {

	var that = this;
	this.spytext = spytext;
	this.element = element;
	this.element.attr('contentEditable', 'true');
	this.config = typeof config.preset === 'string' ? _.merge(this.presets[config], config) : config;
	this.selectron = new Selectron(element);
	this.timeout = null;

	var children = element.childNodes.toArray();
	for(var i in children) {
		if(children[i].nodeType !== 3) continue;
		if(children[i].textContent.match(/^\s+$/)) {
			children[i].vanish();
		} else {
			children[i].textContent = children[i].textContent.trim();
			children[i].wrap(O('<p></p>'));
		}
	}

	if(!element.firstChild) element.append(O('<p><br /></p>'));

	// needs to be loaded after DOM manipulation
	this.snapback = new Snapback(element, { preset: 'spytext', selectron: this.selectron});

	_.each(this.events, function(func, name) {
		element.bind(name, func, that);
	});
};
SpytextField.prototype = {
	activate: function() {
		this.spytext.setCurrentField(this);
	},
	deactivate: function() {
		this.spytext.unsetCurrentField();
	},
	presets: {
		full: {
			buttons: [ 'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat' ]
		},
		format: {
			buttons: [ 'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat' ]
		}
	},
	events: {
		focus: function () {
			this.snapback.enable();
			this.activate();
		},
		blur: function () {
			this.snapback.register();
			this.snapback.disable();
			this.deactivate();
		},
		mousedown: function(e) {
			this.spytext.mousedown = true;
		},
		keyup: function(e) {
		},
		keydown: function(e) {
			if (e.ctrlKey) {
				clearTimeout(this.timeout);
				this.timeout = null;
				this.snapback.register();
				switch(e.keyCode) {
					case 66://b
					case 85://u
						e.preventDefault();
						var arr = [];
						arr[66] = 'bold';
						arr[85] = 'underline';
						this.spytext.execute('format', { command: arr[e.keyCode] }, this.element);
						break;
					case 89://y
						e.preventDefault();
						this.snapback.redo();
						break;
					case 90://z
						e.preventDefault();
						this.snapback.undo();
						break;
					case 65://a
						e.preventDefault();
						this.selectron.select(this.element);
						break;
					case 84://t
						e.preventDefault();
						break;
					case 86://v
						// DO nothing, let paste event be handles
						break;
				}
			} else {
				switch(e.keyCode) {
					case 33:
					case 34:
					case 35:
					case 36:
					case 37:
					case 38:
					case 39:
					case 40:
						clearTimeout(this.timeout);
						this.timeout = null;
						this.snapback.register();
						break;
					default:
						var that = this;
						clearTimeout(this.timeout);
						this.timeout = setTimeout(function() {
							that.timeout = null;
							that.snapback.register();
						}, 1000);
						break;
				}
			}
		},
		paste: function (e) {
			e.preventDefault();
			this.spytext.execute('paste', e.clipboardData ? e.clipboardData : clipboardData);
		}
	}
};
