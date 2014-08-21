var Spytext = function() {
	var that = this;
	this.fields = [];
	this.currentField = null;
	this.buttons = [];
	_.each(this.events.doc, function(func, name) {
		document.bind(name, func, that);
	});
	this.mousedown = false;
};
Spytext.prototype = {
	setCurrentField: function(field) {
		if(this.fields.indexOf(field) > -1) {
			this.currentField = field;
			// TODO activate buttons
		} else {
			this.unsetCurrentField();
		}
	},
	unsetCurrentField: function() {
		this.currentField = null;
		// TODO deactivate buttons
	},
	events: {
		doc: {
			mouseup: function(e) {
				if(this.mousedown && this.currentField) {
					this.currentField.snapback.register();
					this.currentField.snapback.setSelectron();
				}
				this.mousedown = false;
			}
		}
	},
	actions: {
		align: function(options) {
			var points = S.points.both(this.currentField.element);
			S.set(points);

			var containedBlocks = S.nodes.elements(this.currentField.element, true, null, true);
			containedBlocks.each(function() {
				if(!this.matches('ul, ol')) this.css('text-align', options.alignment);
			});
		},
		block: function(options) {
			var wrapper = O('<' + options.tag + '></' + options.tag + '>');
			var points = S.points.both(this.currentField.element);
			S.set(points);
			var sel = S.s();

			// TODO split list
			var containedBlocks = S.nodes.elements(this.currentField.element, true, null, true);
			containedBlocks.each(function() {
				var that = this;
				var tmp;
				if(this.nodeName === 'UL' || this.nodeName === 'OL') {
					var listItems = this.M('li');
					listItems.each(function() {
						S.set(points);
						if(sel.containsNode(this, true)) {
							tmp = wrapper.clone();
							if(this.previousSibling) that.after(tmp);
							else that.before(tmp);
							while(this.firstChild) {
								tmp.append(this.firstChild);
							}
							this.remove();
						}
					});
					if(!this.firstChild) this.remove();
				} else {
					tmp = wrapper.clone();
					this.before(tmp);
					while(this.firstChild) {
						tmp.append(this.firstChild);
					}
					this.remove();
				}
			});
			S.set(points);
		},
		list: function(options){
			var tags = {
				ordered: 'OL',
				unordered: 'UL'
			};
			var tagName = tags[options.type];
			var list = O('<' + tagName + '></' + tagName + '>');
			var selection = S.save(this.currentField.element);
			selection.load();
			var containedBlocks = S.nodes.elements(this.currentField.element, true, null, true);
			containedBlocks[0].before(list);
			containedBlocks.each(function(){
				if(this.nodeName === 'UL' || this.nodeName === 'OL') {
					if(containedBlocks.length === 1) {
						if(this.tagName !== tagName) {
							var containedLi = S.nodes.elements(this, true, null, true);
							if(this.firstChild === containedLi[0]) {
								this.before(list);
								containedLi.each(function() {
									list.append(this);
								});
								if(!this.firstChild) this.remove();
							} else if (this.lastChild === containedLi[containedLi.length - 1]) {
								this.after(list);
								while(this.lastChild === containedLi[containedLi.length - 1]) {
									containedLi.each(function() {
										list.append(this);
									});
								}
							} else {
								var bottomList = O('<' + this.tagName + '><' + this.tagName + '/>');
								this.after(bottomList);
								while(this.lastChild !== containedLi[containedLi.length - 1]) {
									bottomList.prepend(this.lastChild);
								}
								this.after(list);
								containedLi.each(function() {
									list.append(this);
								});
							}
						}
					} else {
						while(this.firstChild) {
							list.append(this.firstChild);
						}
						this.remove();
					}
				} else {
					var listItem = O('<li></li>');
					list.append(listItem);
					while(this.firstChild) {
						listItem.append(this.firstChild);
					}
					list.append(listItem);
					this.remove();
				}
			});
			selection.load();
		},
		indent: function(){
		},
		format: function(options){
			var tags = {
				underline: 'U',
				bold: 'B'
			};
			var wrapper = options.container ? O(options.container) : O('<' + tags[options.command] + '></' + tags[options.command] + '>');
			var points = S.points.both(this.currentField.element);
			S.set(points);
			var containedBlocks = S.nodes.elements(this.currentField.element, true, null, true);
			if(S.isCollapsed()){
				var closest = rng.startContainer.closest(wrapper.tagName);
				while(closest) {
					closest.unwrap();
					closest = closest.closest(wrapper.tagName);
				}
			} else {
				var textNodes = S.nodes.textNodes(this.currentField.element).toArray();
				var rng = S.range();
				if(rng.endOffset < rng.endContainer.textContent.length) {
					rng.endContainer.splitText(rng.endOffset);
				}
				if(rng.startOffset > 0) {
					textNodes = textNodes.slice(1);
					textNodes.unshift(rng.startContainer.splitText(rng.startOffset));
				}
				textNodes = M(textNodes);
				textNodes.wrap(wrapper);

			}
			containedBlocks.tidy(wrapper.tagName);
			S.set(points);
		},
		link: function (attribute) {
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
		type: {}
	},
	addButton: function(element, config) {
		var field = new SpytextButton(element, config, this);
		this.buttons.push(field);
		return field;
	},
	addField: function(element, config, snapback) {
		var button = new SpytextField(this, element, config, snapback);
		this.fields.push(button);
		return button;
	},
	execute: function(action, options) {
		var snapback = this.currentField.snapback;
		snapback.register();
		snapback.setSelectron();
		this.actions[action].call(this, options);
		setTimeout(function() {
			snapback.register();
		}, 100);
	}
};
var SpytextButton = function(element, config, spytext) {
	this.spytext = spytext;
	this.config = typeof config === 'string' ? this.presets[config] : config;
	this.element = element;
	this.element.bind('click', this.events.click, this);
};
SpytextButton.prototype = {
	events: {
		click: function() {
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
		removeFormat: { action: 'format', options: { command: 'removeFormat' }},
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
	this.config = typeof config === 'string' ? this.presets[config] : config;
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
				{ name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']},
				{ name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
				{ name: 'list', buttons: ['unorderedList', 'orderedList']}
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
var SpytextField = function(spytext, element, config, snapback) {
	var that = this;
	this.spytext = spytext;
	this.element = element;
	this.element.attr('contentEditable', 'true');
	this.config = typeof config === 'string' ? this.presets[config] : config;
	this.snapback = snapback;
	this.timeout = null;
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
						S.set({ start: { ref: this.element, offset: 0 }, end: { ref: this.element, offset: this.element.textContent.length } });
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