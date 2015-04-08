var MOD = require('tcb-mod');
var M = MOD.M;
var O = MOD.O;
var D = MOD.D;
require('./mod-extensions');

var Selectron = require('./selectron');
var Snapback = require('tcb-snapback');

[ 'forEach' ].forEach(function(method) {
	NodeList.prototype[method] = Array.prototype[method];
});

function merge() {
	var obj = arguments[0];
	function recurse(inObj, inMerge) {
		for(var property in inMerge) {
			if(!inMerge.hasOwnProperty(property)) continue;

			if(typeof inObj[property] === 'object' && typeof inMerge[property] === 'object') {
				recurse(inObj[property], inMerge[property]);
			} else {
				inObj[property] = inMerge[property];
			}
		}
	}
	for(var i = 1; i < arguments.length - 1; i++) {
		recurse(obj, arguments[i]);
	}
	return obj;
}

var Spytext = function(element, config, toolbar) {
	this.fields = [];

	this.currentField = null;

	for(var property in this.events.doc) 
		$(document).on(property, this.events.doc[property].bind(this));

	if(toolbar) {
		this.toolbar = toolbar;
	} else {
		this.toolbar = new SpytextToolbar({ preset: 'standard' }, this);
		$(document.body).prepend(this.toolbar.element);
	}
};

Spytext.prototype = {
	setCurrentField: function(field) {
		if(field && this.fields.indexOf(field) > -1) {
			if(!field.isActive())
				field.activate();
			this.currentField = field;
			this.toolbar.enable();
		} else {
			if(this.currentField) {
				if(this.currentField.isActive())
					this.currentField.deactivate();
				this.currentField = null;
			}
			this.toolbar.disable();
		}
	},

	observe: function() {
		if(this.currentField) {
			this.currentField.observe();
		}
	},

	unobserve: function() {
		if(this.currentField) {
			this.currentField.unobserve();
		}
	},

	events: {
		doc: {
			mouseup: function(e) {
				if(this.field) {
					this.currentField.snapback.register();
					setTimeout(function() {
						this.toolbar.setActiveStyles();
					}.bind(this), 100);
				}
			}
		}
	},

	actions: {
		align: function(options) {
			var containedChildren = this.currentField.selectron.contained(1,1);
			containedChildren.each(function() {
				if(!this.matches('ul, ol')) $(this).css('text-align', options.alignment);
			});
		},

		block: function(options) {
			function block(node, insertBefore) {
				var $insertBefore = insertBefore ? $(insertBefore) : $(node);
				var $tmp = $wrapper.clone();
				$insertBefore.before($tmp);
				while(node.firstChild) {
					$tmp.append(node.firstChild);
				}
				$(node).remove();
				// MOD
				$tmp[0].setBR();
				blocks.push($tmp[0]);
			}
			var that = this;
			var positron = this.currentField.selectron.get(true);
			var $wrapper = $('<' + options.tag + '></' + options.tag + '>');

			var blocks = [];

			this.currentField.selectron.contained(1, 1).forEach(function(child){
				if(child.nodeName === 'UL' || child.nodeName === 'OL') {
					var li = $(child).children('li').toArray();
					var containedLi = that.currentField.selectron.contained(li);
					var startIndex = li.indexOf(containedLi[0]);
					containedLi.forEach(function(element) {
						block(element, child);
					});

					if(!child.firstChild) $(child).remove();
					else if(startIndex > 0) {
						var $bottomList = $('<' + child.tagName + '><' + child.tagName + '/>');
						$(child).after($bottomList);
						while(startIndex < child.childNodes.length) {
							$bottomList.prepend(child.lastChild);
						}
						$(child).after(M(blocks));
					}
				} else {
					block(child);
				}
			});
			positron.restore();
		},

		deleteRangeContents: function(rng) {
			function removeNodes(node, startNode) {
				startNode = startNode || node;
				var next;
				var tmp = node;
				while(!next && tmp && tmp !== startBlock) {
					if(tmp.nextSibling) next = tmp.nextSibling;
					else tmp = tmp.parentNode;
				}
				if(node && startNode !== node) {
					node.vanish();
				}
				if(next) removeNodes(next, startNode);
			}
			function appendNodes(node, startNode) {
				startNode = startNode || node;
				var next;
				var tmp = node;
				while(!next && tmp && tmp !== endBlock) {
					if(tmp.nextSibling) next = tmp.nextSibling;
					else tmp = tmp.parentNode;
				}
				
				if(node && startNode !== node) {
					startBlock.appendChild(node);
				}
				if(next) appendNodes(next, startNode);
			}
			var that = this;
			var commonAncestor = rng.commonAncestorContainer;
			if(commonAncestor === this.currentField.element || (commonAncestor.nodeType === 1 && commonAncestor.matches('UL, OL'))) {
				var positron = this.currentField.selectron.get();
				var firstNode, lastNode;
				var startAncestors = rng.startContainer.ancestors(null, this.currentField.element).toArray();
				var startBlock = startAncestors.length > 0 ? startAncestors[startAncestors.length - 1] : this.currentField.element.firstChild;
				var completelyContainedBlocks = this.currentField.selectron.contained(1, 1, true);
				if(this.currentField.selectron.contained(M(startBlock), null, true).length > 0) {
					startBlock.empty();
				} else {
					if(startBlock.firstChild.tagName === 'LI') {
						$(this.currentField.selectron.contained(startBlock.childNodes, null, true)).remove();
						startBlock = rng.startContainer.closest('LI', endBlock);
					}

					node = rng.startContainer;

					while(node && node.nodeType !== 3) node = node.firstChild;

					if(node) {
						node.splitText(rng.startOffset);
						firstNode = node;
						removeNodes(node);
					}
				}
				var endAncestors = rng.endContainer.ancestors(null, this.currentField.element).toArray();
				var endBlock = endAncestors[endAncestors.length - 1];
				if(endBlock && this.currentField.selectron.contained(M(endBlock), null, true).length < 1) {
					var block;
					if(endBlock.firstChild.tagName === 'LI') {
						block = rng.endContainer.closest('LI', endBlock);
						$(this.currentField.selectron.contained(endBlock.childNodes, null, true)).remove();
					} else block = endBlock;

					var tmpPositron = positron.clone();
					tmpPositron.start = { ref: block, offset: 0, isAtStart: true };
					tmpPositron.restore();
					this.currentField.selectron.range().deleteContents();
					while(block.firstChild) {
						startBlock.appendChild(block.firstChild);
					}
					block.vanish();
					//positron.start = { ref: startBlock, offset: startBlock.textContent.length, isAtStart: startBlock.textContent.length === 0 };
					//positron.end = positron.start;
				}

				if(!startBlock.firstChild || startBlock.firstChild.textContent.length === 0 || startBlock.firstChild.textContent.match(/^\s+$/)) {
					if(startBlock.firstChild && (startBlock.firstChild.textContent.length === 0 || startBlock.firstChild.textContent.match(/^\s+$/))) {
						startBlock.firstChild.vanish();
					}
					if(startBlock.matches('UL, OL')) {
						var p = O('<p>');
						startBlock.before(p);
						startBlock.vanish();
						startBlock = p;
					}
					startBlock.setBR();
					positron.start = { ref: startBlock, offset: 0, isAtStart: true };
				}
				//completelyContainedBlocks = completelyContainedBlocks.toArray();
				//completelyContainedBlocks.shift();
				M(completelyContainedBlocks).vanish();
				positron.end = positron.start;
				positron.restore();
			} else {
				rng.deleteContents();
			}
		},

		join: function(node1, node2) {
			var positron = this.currentField.selectron.get(true);
			var pa = node2.parentNode;
			if(node1.matches('LI') && node2.matches('LI') && node1.closest('UL,OL') !== node2.closest('UL, OL')) {
				node1.after(M(pa.children));
				pa.vanish();
			} else {
				if(node1.lastChild.tagName === 'BR') node1.removeChild(node1.lastChild);
				if(node2.nodeType === 1 && node2.matches('UL, OL')) node2 = node2.firstChild;
				while(node2.firstChild) 
					node1.appendChild(node2.firstChild);
			}
			node1.setBR();
			if(!node2.firstChild || node2.textContent.length === 0) node2.vanish();
			else node2.setBR();
			if(!pa.firstChild) pa.vanish();
			node1.setBR();
			positron.restore();
		},

		newline: function() {
			var rng = this.currentField.selectron.range();
			var block = rng.startContainer.nodeType === 1 && rng.startContainer.matches('LI, P, H1, H3, H4, H5, H6') ? rng.startContainer : rng.startContainer.closest('LI, P, H1, H2, H3, H4, H5, H6', this.currentField.element);

			var positron = this.currentField.selectron.get(block, true);
			var contents;
			if(block.matches('LI') && block.textContent.length === 0) {
				// TODO check if there is ancestor LI, if so oudent instead
				this.actions.block.call(this, { tag: 'P' });
			} else {
				var el = O('<' + block.tagName + '>');
				block.after(el);
				if(positron.end.offset !== positron.end.ref.textContent.length) {
					positron.end = { ref: block, offset: block.textContent.length };
					positron.restore();
					contents = this.currentField.selectron.range().extractContents();
				}

				while(contents && contents.firstChild) 
					el.appendChild(contents.firstChild);

				el.setBR();
				block.setBR();

				this.currentField.selectron.set(el, 0);
			}
		},

		list: function(options){
			var that = this;
			var tags = {
				ordered: 'OL',
				unordered: 'UL'
			};
			var $list = $('<' + options.tag + '></' + options.tag + '>');
			var positron = this.currentField.selectron.get(null, true);
			var containedChildren = this.currentField.selectron.contained(1, 1);

			if(containedChildren.length === 1 && containedChildren[0].tagName === options.tag) return;

			$(containedChildren[0]).before($list);

			containedChildren.forEach(function(child){
				if(child.nodeName === 'UL' || child.nodeName === 'OL') {
					var li = $(child).children('li').toArray();
					var containedLi = that.currentField.selectron.contained(li);
					var startIndex = li.indexOf(containedLi[0]);

					containedLi.forEach(function(innerChild) {
							$list.append(innerChild);
					});

					if(!child.firstChild) $(child).remove();

					else if(startIndex > 0) {
						var $bottomList = $('<' + child.tagName + '><' + child.tagName + '/>');
						while(startIndex < child.childNodes.length) {
							$(child).after($bottomList);
							$bottomList.prepend(child.lastChild);
						}
						$(child).after($list);
					}
				} else {
					var $listItem = $('<li></li>');
					$list.append($listItem);
					while(child.firstChild) {
						$listItem.append(child.firstChild);
					}
					$list.append($listItem);
					$(child).remove();
				}
			});
			positron.restore();
		},

		indent: function(){
			var allLi = this.currentField.selectron.contained('li');
			var positron = this.currentField.selectron.get(null, true);
			for(var i = 0; i < allLi.length; i++) {
				//var add = allLi[i].closest('li', this.currentField.element);
				var listTag = allLi[i].closest('ul, ol', this.currentField.element).tagName;

				var prev = allLi[i].previousSibling;
				if(prev) {
					var nested = prev.offspring(listTag)[0];
					var list = nested || O('<' + listTag + '></' + listTag + '>');

					if(list !== nested) prev.append(list);

					list.append(allLi[i]);
				}
				//if(!add) add = allLi[i];
				//
				//if(li.indexOf(add) === -1) li.push
				//var prev = listItems[i].previousSibling;
				//if(prev) {
				//}
			}
			positron.restore();
		},

		format: function(options){
			var positron = this.currentField.selectron.get(null, true);
			// NodeList converted to Array to that we can splice it if needed
			var containedTextNodes = this.currentField.selectron.contained(3).toArray();
			var rng = this.currentField.selectron.range();
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
			M(containedTextNodes).wrap(options.container ? O(options.container).clone() : O('<' + options.tag + '></' + options.tag + '>'));
			this.currentField.selectron.contained(1, 1).tidy(options.container ? options.container.tagName : options.tag);
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
			var rng = this.currentField.selectron.range();

			var str = dataTransfer.getData('Text');
			str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+$/g, '');
			var arr = str.split(/[\n\r]+/);

			var block = rng.startContainer.nodeType === 1 && rng.startContainer.matches('LI, H1, H2, H3, H4, H5, H6, P') ? rng.startContainer : rng.startContainer.closest('LI, H1, H2, H3, H4, H5, H6, P');
			var positron = this.currentField.selectron.get(block);
			var textNode;
			if(arr.length === 0) {
				return;
			} else if (arr.length === 1) {
				textNode = document.createTextNode(arr[0]);
				if(rng.startOffset === 0) {
					if(rng.startContainer.nodeType === 1) {
						if(rng.startContainer.lastChild.nodeName === 'BR')
							rng.startContainer.lastChild.vanish();
						rng.startContainer.prepend(textNode);
					} else rng.startContainer.parentNode.prepend(textNode);
				} else if (rng.startOffset === rng.startContainer.textContent.length) {
					if(rng.startContainer.nodeType === 1) rng.startContainer.append(textNode);
					else rng.startContainer.parentNode.append(textNode);
				} else {
					var node = rng.startContainer;
					node.splitText(rng.endOffset);
					node.after(textNode);
				}
				positron.start.offset = positron.start.offset + textNode.textContent.length;
				positron.end = positron.start;
			} else {
				positron.end = { ref: block, offset: block.textContent.length };
				positron.restore();

				var contents = this.currentField.selectron.range().extractContents();
				for(var i = arr.length - 1; i >= 0; i--) {
					textNode = document.createTextNode(arr[i]);
					if(i === 0) {
						if(block.lastChild.nodeName === 'BR')
							block.lastChild.vanish();
						block.append(textNode);
					} else {
						var el = O('<' + block.tagName + '>');
						el.append(textNode);
						if(i === arr.length - 1) {
							while(contents.firstChild) {
								el.append(contents.firstChild);
							}
							positron.start = { ref: el, offset: textNode.textContent.length, isAtStart: false };
							positron.end = positron.start;
						}
						block.after(el);
					}
				}
			}
			positron.restore();

			//document.execCommand('insertText', null, str);
		},

		removeFormat: function() {
			document.execCommand('removeFormat');
		}
	},

	removeField: function(ufo) {
		if(ufo instanceof SpytextField) {
			var index = this.fields.indexOf(ufo);
			if(index > -1) {
				this.fields.splice(index, 1);
			}
		} else if (ufo instanceof Element) {
			for(var i = 0; i < this.fields.length; i++) {
				if(this.fields[i].element === ufo) {
					this.fields.splice(i, 1);
					break;
				}
			}
		}
	},

	addField: function(element, config) {
		config = config || { preset: 'full' };
		var field = new SpytextField(this, element, config);
		this.fields.push(field);
		return field;
	},

	execute: function(action, options) {
		this.currentField.selectron.normalize();
		this.currentField.snapback.register();

		if(this.actions[action]) {
			this.actions[action].call(this, options);
			this.toolbar.setActiveStyles();

			setTimeout(function() {
				this.currentField.snapback.register();
			}.bind(this), 100);
		}
	}
};

var SpytextButton = function(config, spytext) {
	this.spytext = spytext;
	this.config = typeof config.preset === 'string' ? merge(this.presets[config.preset], config) : config;
	this.element = O('<button class="spytext-button" st-button-type="' + config.preset + '" tabindex="' + -1 + '">');

	for(var property in this.events)
		$(this.element).on(property, this.events[property].bind(this));

	this.disable();
};

SpytextButton.prototype = {
	setActive: function() {
		$(this.element).addClass('active');
	},

	unsetActive: function() {
		$(this.element).removeClass('active');
	},

	enable: function() {
		this.element.disabled = false;
	},

	disable: function() {
		this.element.disabled = true;
		this.unsetActive();
	},

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
		bold: { title: 'Bold', action: 'format', options: { tag: 'B' }},
		strikeThrough: { title: 'Strike Through', action: 'format', options: { tag: 'STRIKE' }},
		underline: { title: 'Underline', action: 'format', options: { tag: 'U' }},
		italic: { title: 'Italic', action: 'format', options: { tag: 'I' }},
		removeFormat: { action: 'removeFormat' },
		typeHeading1: { title: 'Heading 1', action: 'block', options: { tag: 'H1' }},
		typeHeading2: { title: 'Heading 2', action: 'block', options: { tag: 'H2' }},
		typeHeading3: { title: 'Heading 3', action: 'block', options: { tag: 'H3' }},
		typeHeading4: { title: 'Heading 4', action: 'block', options: { tag: 'H4' }},
		typeHeading5: { title: 'Heading 5', action: 'block', options: { tag: 'H5' }},
		typeHeading6: { title: 'Heading 6', action: 'block', options: { tag: 'H6' }},
		typeParagraph: { title: 'Paragraph', action: 'block', options: { tag: 'P' }},
		orderedList: { title: 'Ordered List', action: 'list', options: { tag: 'OL' }},
		unorderedList: { title: 'Unordered List', action: 'list', options: { tag: 'UL' }},
		indent: { title: 'Indent', action: 'indent', options: { outdent: false }},
		outdent: { title: 'Outdent', action: 'indent', options: { outdent: true }}
	}
};

var SpytextDropdown = function(config, spytext) {
	this.spytext = spytext;
	this.config = typeof config.preset === 'string' ? merge(this.presets[config.preset], config) : config;
	this.items = [];
	this.element = $('<ul class="spytext-dropdown">')[0];

	var property;

	this.config.items.forEach(function(item) {
		var $el = $('<li><span>' + item.title + '</span></li>');
		$(this.element).append($el);

		for(property in this.events.item) 
			$el.on(property, this.events.item[property].bind(this));

		this.items.push(item);
	}.bind(this));

	for(property in this.events.dropdown) 
		this.element.bind(property, this.events.dropdown[property], this);
	
	this.index = 0;
	this.length = this.element.offspring().length;
	this.disable();
};

SpytextDropdown.prototype = {
	setIndex: function(index) {
		this.index = index;
		var liHeight = this.element.children[0].offsetHeight;
		var children = this.element.children;

		for(var i = 0; i < children.length; i++) {
			$(children[i]).css('top', '-' + (index * liHeight) + 'px');

			if(i === index) $(children[i]).addClass('active');
			else $(children[i]).removeClass('active');
		}
	},

	setNoActive: function() {
		this.index = 0;
		var children = this.element.children;

		for(var i = 0; i < children.length; i++) {
			$(children[i]).css('top', '0');
			$(children[i]).removeClass('active');
		}
	},

	setActive: function(options) {
		for(var i = 0; i < this.items.length; i++) 
			for(var prop in options) 
				if(options[prop] === this.items[i].options[prop]) 
					return this.setIndex(i);
	},

	enable: function() {
		this.element.removeClass('disabled');
	},

	disable: function() {
		$(this.element).addClass('disabled').removeClass('expanded');
		this.setNoActive();
	},

	events: {
		dropdown: {
			click: function(e) {
				if(this.spytext.currentField) {
					$(this.element).toggleClass('expanded');
				}
			}
		},

		item: {
			click: function(e) {
				if($(this.element).hasClass('expanded')) {
					var index = this.element.offspring().indexOf(e.currentTarget);
					this.spytext.execute(this.config.action, this.items[index].options);
				}
			}
		}
	},

	presets: {
		type: {
			action: 'block',
			items: [
				{ title: 'Heading 1', options: { tag: 'H1' }},
				{ title: 'Heading 2', options: { tag: 'H2' }},
				{ title: 'Heading 3', options: { tag: 'H3' }},
				{ title: 'Heading 4', options: { tag: 'H4' }},
				{ title: 'Heading 5', options: { tag: 'H5' }},
				{ title: 'Heading 6', options: { tag: 'H6' }},
				{ title: 'Paragraph', options: { tag: 'P' }}
			]
		}
	}
};

var SpytextToolbar = function(config, spytext) {
	this.dropdowns = [];
	this.buttons = [];
	this.spytext = spytext;
	this.config = typeof config.preset === 'string' ? merge(this.presets[config.preset], config) : config;
	this.element = $('<div class="spytext-toolbar">')[0];

	for(var property in this.config.dropdowns) 
		this.addDropdown.call(this, this.config.dropdowns[property], property);

	for(property in this.config.buttonGroups) 
		this.addButtonGroup.call(this, this.config.buttonGroups[property], property);

	for(property in this.events) 
		this.element.bind(property, this.events[property], this);
};

SpytextToolbar.prototype = {
	addButtonGroup: function(group) {
		var $ul = $('<UL>').addClass('spytext-button-group ' + group.name);
		group.buttons.forEach(function(buttonType) {
			var $li = $('<LI>');
			var button = this.addButton({ preset: buttonType }, this.spytext);
			$ul.append($li);
			$li.append(button.element);
		}.bind(this));
		$(this.element).append($ul);
	},

	addButton: function(config) {
		var button = new SpytextButton(config, this.spytext);
		this.buttons[config.preset] = button;
		return button;
	},

	addDropdown: function(config) {
		config = typeof config === 'string' ? { preset: config } : config;
		var dropdown = new SpytextDropdown(config, this.spytext);
		this.dropdowns[config.preset] = dropdown;
		$(this.element).append(dropdown.element);
		return dropdown;
	},

	enable: function() {
		for(var i in this.buttons) {
			var button = this.buttons[i];
			//button.element.setAttribute('disabled');
			button.enable();
		}
		for(var j in this.dropdowns) {
			this.dropdowns[j].enable();
			//button.element.setAttribute('disabled');
		}
		$(this.element).addClass('active');
	},

	disable: function() {
		for(var i in this.buttons) {
			this.buttons[i].disable();
		}
		for(var j in this.dropdowns) {
			this.dropdowns[j].disable();
		}
		$(this.element).removeClass('active');
	},

	setActiveStyles: function() {
		function setBlock(tag) {
			switch(tag) {
				case 'P':
				case 'H1':
				case 'H2':
				case 'H3':
				case 'H4':
				case 'H5':
				case 'H6':
					if(that.dropdowns.type) {
						that.dropdowns.type.setActive({ tag: tag });
					}
					break;
				case 'UL':
					that.buttons.unorderedList.setActive();
					that.dropdowns.type.setNoActive();
					break;
				case 'OL':
					that.buttons.orderedList.setActive();
					that.dropdowns.type.setNoActive();
					break;
			}
		}

		var that = this;
		var tags = [];
		var blocks = [];
		var rng;
		var s = 0;

		while(!rng) {
			rng = this.spytext.currentField.selectron.range();
			if(s++ > 10000) return;
		}

		if(!rng) return;

		if(rng.collapsed) {
			// MOD
			tags = rng.startContainer.ancestors(null, this.spytext.currentField.element).toArray();
			if(tags.length > 0) blocks.push(tags.pop());
		} else {
			// MOD
			var el = rng.commonAncestorContainer;
			tags = el.ancestors(null, this.spytext.element).toArray();
		}

		// MOD
		tags = M(tags);

		for(var i in this.buttons) {
			var button = this.buttons[i];
			if(button.config.options && tags.includes(button.config.options.tag)) {
				button.setActive();
			} else button.unsetActive();
		}
		var blockTag;
		for(var j = 0; j < blocks.length; j++) {
			if(blockTag && blockTag !== blocks[j].tagName) {
				blockTag = null;
				break;
			} else {
				blockTag = blocks[j].tagName || null;
			}
		}
		if(blockTag) setBlock(blockTag);
	},

	presets: {
		standard: {
			dropdowns: [ 'type' ],
			buttonGroups: [
				//{ name: 'block', buttons: ['typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6', 'typeParagraph']},
				{ name: 'format', buttons: ['bold', 'italic', 'underline', 'strikeThrough', 'removeFormat']},
				{ name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
				{ name: 'list', buttons: ['unorderedList', 'orderedList']},
				{ name: 'indent', buttons: ['indent', 'outdent']}
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
	this.spytext = spytext;
	this.element = element;
	this.originalValue = element.innerHTML;
	this.element.attr('contentEditable', 'true');
	this.config = typeof config.preset === 'string' ? merge(this.presets[config], config) : config;
	this.selectron = new Selectron(element);
	this.timeout = null;
	this.active = false;

	this.clearTextNodes();

	// needs to be loaded after DOM manipulation
	this.snapback = new Snapback(element, { preset: 'spytext', selectron: this.selectron});

	for (var property in this.events)
		$(element).on(property, this.events[property].bind(this));
};

SpytextField.prototype = {
	clearTextNodes: function() {
		var children = this.element.childNodes.toArray();
		for(var i in children) {
			if(children[i].nodeType !== 3) continue;
			if(children[i].textContent.match(/^\s+$/)) {
				$(children[i]).remove();
			} else {
				$(children[i]).text(children[i].textContent.trim());
				$(children[i]).wrap('<p></p>');
			}
		}

		if(!this.element.firstChild) {
			$(this.element).append('<p><br /></p>');
		}
		// MOD
		this.element.setBR();
	},

	isActive: function() {
		return this.active;
	},

	activate: function() {
		this.clearTextNodes();
		this.snapback.enable();
		this.observe();
		this.active = true;
		this.spytext.setCurrentField(this);
	},

	deactivate: function() {
		this.snapback.register();
		this.snapback.disable();
		this.unobserve();
		this.active = false;
		this.spytext.setCurrentField();
	},

	observe: function() {
		// TODO enable option to turn on/off observation of changes
		var that = this;
		var timeout;
		function dispatch(mutation) {
			that.element.dispatchEvent(new CustomEvent('change', { bubbles: true , details: { mutation: mutation }}));
		}
		function change(mutations) {
			if(mutations[0].type === 'characterData') {
				if(timeout) 
					clearTimeout(timeout);

				timeout = setTimeout(dispatch, 300);
			} else {
				dispatch(mutations);
			}
		}
		if(!this.mutationObserver) {
			this.mutationObserver = new (typeof MutationObserver !== 'undefined' ? MutationObserver : (typeof WebKitMutationObserver !== 'undefined' ? WebKitMutationObserver : undefined))(change);
		}
		this.mutationObserver.observe(this.element, { subtree: true, characterData: true, childList: true, attributes: true });
	},

	unobserve: function() {
		if(this.mutationObserver) {
			this.mutationObserver.disconnect();
		}
	},

	presets: {
		full: {
			buttons: [ 'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat' ],
			dropdowns: [ 'type ' ]
		},
		format: {
			buttons: [ 'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat' ]
		}
	},

	events: {
		focus: function () {
			this.activate();
		},

		blur: function () {
			this.deactivate();
		},

		mouseup: function(e) {
			this.spytext.toolbar.setActiveStyles();
		},

		keyup: function(e) {
			switch(e.keyCode) {
				case 33:
				case 34:
				case 35:
				case 36:
				case 37:
				case 38:
				case 39:
				case 40:
					this.spytext.toolbar.setActiveStyles();
					break;
				default:
			}
		},

		keydown: function(e) {
			function inbetween(a, b) {
				var num = e.keyCode;
				var min = Math.min(a,b);
				var max = Math.max(a,b);
				return num >= min && num <= max;
			}

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
				var rng = this.selectron.range();
				if(inbetween(33,40)) {
					clearTimeout(this.timeout);
					this.timeout = null;
					this.snapback.register();
				} else if(!rng.collapsed && (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 13 || inbetween(65, 90) || inbetween(48, 57) || inbetween(186, 222) || inbetween(96, 111))) {
					this.snapback.register();
					this.spytext.actions.deleteRangeContents.call(this.spytext, rng);

					if(e.keyCode === 8 || e.keyCode === 46) {
						e.preventDefault();
					}
				} else {
					clearTimeout(this.timeout);
					this.timeout = setTimeout(function() {
						this.timeout = null;
						this.snapback.register();
					}.bind(this), 300);
				}

				var li, block, positron;
				switch(e.keyCode) {
					case 8:
						// backspace
						rng = this.selectron.range();
						if(rng.collapsed) {
							block = this.element.childNodes.includes(rng.startContainer) ? rng.startContainer : rng.startContainer.closest(this.element.childNodes);
							if(block.matches('UL, OL')) {
								li = rng.startContainer.nodeType === 1 && rng.startContainer.matches('LI') ? rng.startContainer : rng.startContainer.closest('LI');
							}
							positron = this.selectron.get(li || block);
							if(positron.start.offset === 0) {
								e.preventDefault();
								var prev = li && li.previousSibling ? li.previousSibling : block.previousSibling;
								if(prev) {
									this.spytext.actions.join.call(this.spytext, prev.matches('UL, OL') ? prev.lastChild : prev, li ? li : block);
								}
							}
						}
						break;
					case 46:
						// delete
						rng = this.selectron.range();
						if(rng.collapsed) {
							block = this.element.childNodes.includes(rng.startContainer) ? rng.startContainer : rng.startContainer.closest(this.element.childNodes);
							if(block.matches('UL, OL')) {
								li = rng.startContainer.nodeType === 1 && rng.startContainer.matches('LI') ? rng.startContainer : rng.startContainer.closest('LI');
							}
							positron = this.selectron.get(li || block);
							if(positron.start.offset === positron.start.ref.textContent.length) {
								e.preventDefault();
								var next = li && li.nextSibling ? li.nextSibling : block.nextSibling;
								if(next) {
									this.spytext.actions.join.call(this.spytext, li ? li : block, next.matches('UL, OL') ? next.firstChild : next);
								}
							}
						}
						break;
					case 13:
						//enter
						e.preventDefault();
						this.spytext.actions.newline.call(this.spytext);
						break;
				}
			}
		},

		paste: function (e) {
			e.preventDefault();

			this.snapback.register();
			var rng = this.selectron.range();

			if(!rng.collapsed) {
				this.spytext.actions.deleteRangeContents.call(this.spytext, rng);
			}

			this.spytext.execute('paste', e.clipboardData ? e.clipboardData : clipboardData);

			setTimeout(function() {
				this.snapback.register();
			}.bind(this), 100);
		}
	}
};

module.exports = Spytext;
