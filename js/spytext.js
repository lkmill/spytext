/*
 * SpyText, a contenteditable library for javascript
 */

var mainFunction = function ($, _) {
	var browser = getBrowser();
	if (!checkBrowser()) {
		alert('you are using an unsuppported browser');
		console.log("browser", browser);
		return;
	}

	//var _siteUrl = 'http://localhost:3000/';
	var _baseClass = 'spytext-';
	var _barClass = _baseClass + 'button-bar';
	var _generatedClass = _baseClass + 'generated';
	var _groupClass = _baseClass + 'button-group';
	var _wrapperClass = _baseClass + 'wrapper';
	var _hasDropdownClass = _baseClass + 'has-dropdown';
	var _dropdownClass = _baseClass + 'dropdown';
	var _elementClass = _baseClass + 'element';
	var _templates = {
		button: _.template(
			'<li>' +
				'<a <% if(attribute){ %>data-attribute="<% attribute %>"<% } %>id="' + _baseClass + 'btn-<%= name %>" title="<%= title %>" href="#" class="' + _baseClass + 'button <%= name %><% if(global){ %> global<% } %>" tabIndex="-1">' +
					//'<% if(icon){ %> <i class="fa fa-<%= icon %>"></i> <% } %>' +
					'<span><%= title %></span>' +
				'</a>' +
			'</li>'
		),
		dropdownLi: _.template(
			'<li class="' + _hasDropdownClass + '">' +
				'<span title="<%= title %>" class="' + _baseClass + 'button dropdown <%= name %>" tabIndex="-1">' +
					//'<% if(icon){ %> <i class="fa fa-<%= icon %>"></i> <% } %>' +
					'<span><%= title %></span>' +
				'</span>' +
			'</li>'
		),
		dropdownUl: _.template('<ul class="' + _dropdownClass + '"></ul>'),
		wrapper: _.template('<div class="' + _wrapperClass + '"></div>'),
		buttonBar: _.template('<div class="' + _barClass + ' <%= position %>"></div>'),
		buttonGroup: _.template('<ul class="' + _groupClass + ' <%= name %>"></ul>')
	};
	var _commands = {
		align: function (attribute, textArea) {
			if (isInList(textArea.element)) {
				alert('You cannot align lists!');
				return;
			}
			var command = 'justify' + attribute.charAt(0).toUpperCase() + attribute.slice(1).toLowerCase();
			document.execCommand(command);
		},
		formatBlock: function (attribute, textArea) {
			if (isInList(textArea.element)) {
				alert('You cannot set type of lists!');
				return;
			}
			document.execCommand('formatBlock', null, attribute);
		},
		generic: function (command, attribute, textArea) {
			document.execCommand(command, null, attribute);
		},
		indent: function (attribute, textArea) {
			//document.execCommand("indent");
			var el = getSurroundingNode();
			var li = $(el).closest('li');
			var prevLi = $(li).prev('li');

			if (prevLi.size() === 1 && li.length > 0) {
				$(li).remove();
				var newUl = $('<ul></ul>');
				newUl.append(li);
				prevLi.append(newUl);
			}
		},
		list: function (attribute, textArea) {
			var tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
			if (intersectsTags(tags, textArea.element)) {
				alert('You cannot make lists out of headings!');
				return;
			}
			if (attribute === 'ol') {
				document.execCommand('insertOrderedList');
			} else if (attribute === 'ul') {
				document.execCommand('insertUnorderedList');
			}
		},
		remove: function (attribute, textArea) {
			var element = textArea.element;
			_hooks.remove(element, _commands.removeAfter);
		},
		removeAfter: function (attribute, result) {
			if (result.errNr) {
				SpyText.showSuccess(result.msg || 'Successfully removed');
			} else {
				SpyText.showError(result.msg || 'Unable to remove');
			}
		},
		removeFormat: function (attribute, textArea) {
			document.execCommand('removeFormat');
		},
		reset: function (attribute, textArea) {
			// TODO get textArea sent in from onClick
			if (textArea && textArea.hasChanged()) {
				selectNodeContents(textArea.element);
				document.execCommand('insertHTML', null, textArea.originalHTML);
			}
		},
		save: function (attribute, textArea) {
			var el = textArea.element;
			_hooks.save(el, _commands.saveAfter);
		},
		saveAfter: function (attribute, result) {
			// TODO make sure textArea gets passed in
			var textArea;
			if (result.errNr) {
				SpyText.showSuccess(result.msg || 'Successfully saved');
			} else {
				SpyText.showError(result.msg || 'Unable to save');
			}
			_.each(SpyText.elements, function (el) {
				textArea.hasChanged();
			});
		},
		showHtml: function (attribute, textArea) {
			alert(getCurrentElement().html());
		},
		showImageDialog: function (attribute, textArea) {
			//console.log('showImageDialog');
		},
		showLinkDialog: function (attribute, textArea) {
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
		undo: function (attribute, textArea) {
			document.execCommand('undo');
			if (browser.name === 'chrome') {
				$('p.' + _generatedClass).each(function () {
					if (window.getSelection().focusNode !== this && $(this).text() === '') {
						$(this).remove();
					}
				});
			}
		}
	};

	var _hooks = {
		save: function (elements, callback) { callback({errNr: 0}); },
		remove: function (elements, callback) { callback({errNr: 0}); }
	};

	var _buttonTypes = {
		//undo: {id: 'undo', title: 'Undo', icon: 'undo', command: 'undo', global: true },
		undo: { title: 'Undo', icon: 'undo', command: 'undo', global: true },
		redo: { title: 'Redo', icon: 'repeat', command: 'redo', global: true },
		type: {  title: 'Font type', text: 'Type', command: 'formatBlock', dropdown: [
			{ title: 'Paragraph', attribute: '<p>' },
			{ title: 'Heading 1', attribute: '<H1>' },
			{ title: 'Heading 2', attribute: '<H2>' },
			{ title: 'Heading 3', attribute: '<H3>' },
			{ title: 'Heading 4', attribute: '<H4>' },
			{ title: 'Heading 5', attribute: '<H5>' },
			{ title: 'Heading 6', attribute: '<H6>' }
		]},
		bold: { title: 'Bold', icon: 'bold', command: 'bold'},
		italic: { title: 'Bold', icon: 'bold', command: 'italic'},
		underline: { title: 'Underline', icon: 'underline', command: 'underline'},
		strikethrough: { title: 'Strikethrough', icon: 'strikethrough', command: 'strikeThrough'},
		'remove-format': { title: 'Remove formatting', icon: 'eraser', command: 'removeFormat'},
		link: { title: 'Link', icon: 'link', command: 'showLinkDialog'},
		align: { title: 'Align', icon: 'align-left', command: 'align', dropdown: [
			{ icon: 'align-left', attribute: 'left'},
			{ icon: 'align-center', attribute: 'center'},
			{ icon: 'align-justify', attribute: 'full'},
			{ icon: 'align-right', attribute: 'right'}
		]},
		'align-left': { title: 'Align Left', icon: 'align-left', command: 'align', attribute: 'left' },
		'align-center': { title: 'Align Center', icon: 'align-center', command: 'align', attribute: 'center' },
		'align-right': { title: 'Align Right', icon: 'align-right', command: 'align', attribute: 'right' },
		'align-justify': { title: 'Justify', icon: 'align-justify', command: 'align', attribute: 'full' },
		'list-ul': { title: 'Unordered list', icon: 'list-ul', command: 'list', attribute: 'ul'},
		'list-ol': { title: 'Ordered list', icon: 'list-ol', command: 'list', attribute: 'ol'},
		'indent-right': { title: 'Indent', icon: 'indent', command: 'indent'},
		'indent-left': { title: 'Unindent', icon: 'outdent', command: 'outdent'},
		image: { title: 'Image', icon: 'picture', command: 'showImageDialog'},
		html: { title: 'Show html', icon: 'code', command: 'showHtml'},
		reset: { title: 'Reset', icon: 'backward', command: 'reset' },
		remove: { title: 'Delete', icon: 'trash', command: 'remove'},
		save: { title: 'Save', icon: 'save', command: 'save', global: true }
	};

	var _buttonDefaults = { title: false, icon: false, command: false, attribute: false, attributes: false, global: false };

	var SpyText = {
		singles: [],
		globals: [],
		groups: [],
		globalToolbar: undefined,
		addHooks: function (h) {
			_.extend(_hooks, h);
		},
		addSingle: function (element) {
			// TODO implement
			console.log('not implemented');
		},
		// adds text areas to the global toolbar
		addGlobals: function (elements, config) {
			// TODO implement
			console.log('not implemented');
		},
		addGroup: function (element) {
			var that = this;
			var toolbar = new SpyTextToolbar({ preset: 'group', parent: element });
			toolbar.disable();
			var elements = $(element).find('[data-name]').get();
			var textAreas = [];
			_.each(elements, function (el) {
				var textArea = new SpyTextArea(el, toolbar);
				textAreas.push(textArea);
			});
			var group = { toolbar: toolbar, textAreas: textAreas };
			this.groups.push(group);
			return group;
		},
		showSuccess: function (text) {
			var dialog = $('<div class="' + _baseClass + 'success">' + text + '</div>');
			$('body').append(dialog);
		},
		showError: function (text) {
			var dialog = $('<div class="' + _baseClass + 'error">' + text + '</div>');
			$('body').append(dialog);
		},
		// TODO check if the destroy methods can be improved
		destroyGlobals: function () {
			_.each(this.globals, function (textArea) {
				textArea.destroy();
			});
			this.globals.length = 0;
			this.globalToolbar.destroy();
			this.globalToolbar = undefined;

		},
		destroyGroup: function (group) {
			var index = this.groups.indexOf(group);
			if (index > -1) {
				_.each(group.textAreas, function (textArea) {
					textArea.destroy();
				});
				group.textAreas.length = 0;
				delete group.textAreas;
				group.toolbar.destroy();
				delete group.toolbar;
				this.groups.splice(index, 1);
			}
		},
		destroySingle: function (single) {
			var index = this.singles.indexOf(single);
			if (index > -1) {
				single.textArea.destroy();
				delete single.textArea;
				single.toolbar.destroy();
				delete single.toolbar;
				this.singles.splice(index, 1);
			}
		}
	};

	var SpyTextArea = function (element, toolbar) {
		var that = this;
		this.toolbar = toolbar;
		this.element = element;
		this.addHooks = function (h) {
			_.extend(_hooks, h);
		};
		this.config = this.presets[$(element).data('preset')];
		_.defaults(this.config, this.defaultConfig);

		if (element.nodeName.toLowerCase() === 'div' && $(element).html().trim() === '') {
			$(element).html('<p><br /></p>');
		} else {
			$(element).html($(element).html().trim());
		}
		this.originalHTML = $(element).html();

		if (element.nodeName.toLowerCase() !== 'div' || $(element).data('type') !== 'textarea') {
			turnOffNewLine(element);
		}
		// to make it easy to get access to the textArea
		element.textArea = this;
		$(element).addClass(_elementClass);
		$(element).focus(function () {
			that.toolbar.enable(that.config.commands);
		});
		$(element).on('blur', function () {
			that.hasChanged();
			that.toolbar.disable();
		});
		$(element).on('keydown', function (e) {
			if (e.keyCode === 90) {
				e.preventDefault();
				_commands.undo(element.textArea);
			}
		});
		$(element).attr('contentEditable', 'true');
		$(element).on('DOMNodeInserted', function (e) {
			var sel, rng, content;
			if (e.target === element) {
				return;
			}
			var $parent = $(e.target).parent();
			var $newElement = $('<p class="' + _generatedClass + '"><br /></p>');
			if (e.target.nodeName.toLowerCase() === 'div') {
				content = e.target.textContent !== '' ? e.target.textContent : '<br />';
				sel = window.getSelection();
				sel.removeAllRanges();
				$(e.target).after($newElement[0]);
				rng = document.createRange();
				rng.selectNodeContents($newElement[0]);
				sel.addRange(rng);
				document.execCommand('insertHtml', false, content);
				$(e.target).remove();
				// TODO make sure this selection works. right now chrome often removes caret
				setTimeout(function () {
					$(element).focus();
					sel.removeAllRanges();
					rng = document.createRange();
					rng.setStart($newElement[0], 0);
					rng.setEnd($newElement[0], 0);
					sel.addRange(rng);
				}, 1);
			} else if (e.target.nodeName.toLowerCase() === 'span') {
				if ($parent[0] === element) {
					alert('oh my, span is child of the textArea!');
					return;
				}
				setCaretAtEndOfElement($parent[0]);
				content = e.target.textContent;
				$(e.target).remove();
				document.execCommand('insertText', false, content);
				sel = window.getSelection();
				rng = sel.getRangeAt(0);
				var node = rng.commonAncestorContainer;
				sel.removeAllRanges();
				rng = document.createRange();
				rng.setStart(node, node.textContent.length - content.length);
				rng.setEnd(node, node.textContent.length - content.length);
				sel.addRange(rng);
			} else if ([ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].indexOf(e.target.nodeName) > -1 && $parent[0] !== element) {
				// TODO check if parent is empty, delete if so.
				$parent.after(e.target);
				setCaretAtEndOfElement(e.target);
			}
		});
		if (this.config.preventFormattedPaste) preventFormattedPaste(element);
		if (this.config.preventTextOutsideParagraph && $(element).data('type') === 'textarea') preventTextOutsideParagraph(element);
	};
	SpyTextArea.prototype = {
		defaultConfig: {
			preset: 'format',
			preventFormattedPaste: true,
			preventTextOutsideParagraph: true
		},
		presets: {
			full: {
				commands: [
					'undo', 'redo',
					'type',
					'bold', 'italic', 'underline', 'strikethrough', 'remove-format',
					'link',
					'align',
					'align-left', 'align-center', 'align-right', 'align-justify',
					'list-ul', 'list-ol',
					'reset'
				],
			},
			'full-without-type': {
				commands: [
					'undo', 'redo',
					'bold', 'italic', 'underline', 'strikethrough', 'remove-format',
					'link',
					'align',
					'align-left', 'align-center', 'align-right', 'align-justify',
					'list-ul', 'list-ol',
					'reset'
				],
			},
			format: {
				commands: [
					'undo', 'redo',
					'bold', 'italic', 'underline', 'strikethrough', 'remove-format',
					'link',
					'reset'
				],
			},
			bare: {
				commands: ['undo', 'redo']
			},
			simpleWithRemove: {
				commands: ['undo', 'redo', 'link', 'html', 'remove', 'save']
			},
			none: {
				commands: []
			}
		},
		hasChanged: function () {
			if (this.originalHTML !== $(this.element).html()) {
				return true;
			} else {
				return false;
			}
		},
		destroy: function () {
			$(this.element).unbind();
			$(this.element).attr('contentEditable', 'false');
			$(this.element).removeClass(_baseClass + 'element');
			delete this.element;
			delete this.addHooks;
			delete this.config;
			delete this.originalHTML;
		}
	};

	var SpyTextToolbar = function (config) {
		var that = this;

		this.config = config || {};
		this.buttons = [];

		var presetConf = this.presets[config.preset ? config.preset : 'global'];

		_.defaults(this.config, presetConf, this.defaultConfig);

		if (this.config.position) this.element = $(_templates.buttonBar({position: this.config.position}));

		if (this.config.parent) {
			$(this.element).prependTo(this.config.parent);
		} else {
			$('body').prepend(this.element);
		}

		if (this.config.buttons) {
			$.each(this.config.buttons, function (i, group) {
				that.addButtonGroup(group);
			});
		}
		
		if (this.config.show) this.show();
		else this.hide();

		$(this.element).on('mousedown', function (ev) {
			ev.preventDefault();
		});
	};
	SpyTextToolbar.prototype = {
		show: function () {
			var that = this;
			$(this.element).show();

			// add margin to body so that top-fixed toolbars won't cover content
			if (this.config.position === 'top-fixed' && $('body').css('margin-top') !== $(this.element).outerHeight() + 'px') {
				$('body').css('margin-top', function (index, curValue) {
					return parseInt(curValue, 10) + $(that.element).outerHeight() + 'px';
				});
			}
		},
		hide: function () {
			var that = this;
			$(this.element).hide();

			// remove margin from body
			if (this.config.position === 'top-fixed' && $('body').css('margin-top') === $(this.element).outerHeight() + 'px') {
				$('body').css('margin-top', function (index, curValue) {
					return parseInt(curValue, 10) - $(that.element).outerHeight() + 'px';
				});
			}
		},
		enable: function (commands) {
			$(this.element).removeClass('disabled');
			_.each(this.buttons, function (button) {
				if (commands.indexOf(button.name) > -1) {
					button.enable();
				}
			});
		},
		disable: function () {
			$(this.element).addClass('disabled');
			_.each(this.buttons, function (button) {
				button.disable();
			});
		},
		addButtonGroup: function (buttonGroup) {
			var that = this;
			var $ul, buttonNames;
			// made it so you can add a name to the buttonGroup, so we can apply an icon and make the group a dropdown if the expanded group does not fit.
			if (buttonGroup instanceof Array) {
				buttonNames = buttonGroup;
				$ul = $(_templates.buttonGroup({ name: 'generic' }));
			} else if (buttonGroup instanceof Object) {
				buttonNames = buttonGroup.buttons;
				$ul = $(_templates.buttonGroup({ name: buttonGroup.name }));
			} else {
				return;
			}
			_.each(buttonNames, function (buttonName) {
				var buttonType = _buttonTypes[buttonName];

				if (!buttonType) return;

				buttonType.name = buttonName;
				_.defaults(buttonType, _buttonDefaults);

				if (buttonType.dropdown) {
					var $li = $(_templates.dropdownLi(buttonType));
					var $nestedUl = $(_templates.dropdownUl());
					_.each(buttonType.dropdown, function (nestedButtonType) {
						nestedButtonType.command = buttonType.command;
						nestedButtonType.name = buttonType.name;

						_.defaults(nestedButtonType, _buttonDefaults);
						var dropdownButton = new SpyTextToolbarButton(nestedButtonType, that);
						$nestedUl.append(dropdownButton.element);
						that.buttons.push(dropdownButton);
					});
					$li.append($nestedUl);
					$ul.append($li);
				} else {
					var button = new SpyTextToolbarButton(buttonType, that);
					that.buttons.push(button);
					$ul.append(button.element);
				}
			});
			$(this.element).append($ul);
		},
		defaultConfig: {
			preset: 'global',
		},
		presets: {
			global: {
				buttonGroups: [
					{ name: 'undo', buttons: ['undo', 'redo']},
					{ name: 'type', buttons: ['type']},
					{ name: 'format', buttons: ['bold', 'italic',  'underline', 'strikethrough', 'remove-format']},//,'color'],
					['link'],
					//['image'],
					{ name: 'align', buttons: ['align-left', 'align-center', 'align-right', 'align-justify']},
					{ name: 'list', buttons: ['list-ul', 'list-ol']},
					//['indent-right','indent-left'],
					//['html'],
					['reset']
				],
				show: true,
				position: 'top-fixed'
			},
			group: {
				buttons: [
					{ name: 'undo', buttons: ['undo', 'redo']},
					{ name: 'type', buttons: ['type']},
					{ name: 'format', buttons: ['bold', 'italic',  'underline', 'strikethrough', 'remove-format']},//,'color'],
					['link'],
					//['image'],
					{ name: 'align', buttons: ['align-left', 'align-center', 'align-right', 'align-justify']},
					{ name: 'list', buttons: ['list-ul', 'list-ol']},
					//{ name: 'indent', ['indent-right','indent-left'] },
					//['html'],
					['reset']
				],
				show: true,
				position: 'prepended'
			},
			full: {
				buttons: [
					{ name: 'undo', buttons: ['undo', 'redo']},
					['type'],
					{ name: 'format', buttons: ['bold', 'underline', 'strikethrough', 'remove-format']},//,'color'],
					['link'],
					//['image'],
					['align'],
					{ name: 'list', buttons: ['list-ul', 'list-ol']},
					//['indent-right','indent-left'],
					//['html'],
					['reset']
				],
				show : false,
				position: 'above-textarea'
			},
			bare: {
				buttons: [['undo', 'redo']],
				show: false,
				position: 'above-textarea'
			},
			simpleWithRemove: {
				buttons: [['undo', 'redo'], ['link'], ['html'], ['remove'], ['save']],
				show: false,
				position: 'above-textarea'
			}
		},
		destroy: function () {
			$(this.element).remove();
			delete this.config;
			this.buttons.length = 0;
			delete this.buttons;
		}
	};

	var SpyTextToolbarButton = function (buttonType, toolbar) {
		var that = this;
		var _disabled = false;

		this.toolbar = toolbar;

		// apply all settings
		_.defaults(this, buttonType, _buttonDefaults);

		var $el = $(_templates.button(this));
		$el.children('.' + _baseClass + 'button').click(_onClick);

		this.element = $el[0];
		// TODO check if one can make better garbage collection
		$el = null;

		this.enable = function () {
			_disabled = false;
			$(this.element).children('.' + _baseClass + 'button').removeClass('disabled');
		};
		this.disable =  function () {
			if (!this.global) {
				_disabled = true;
				$(this.element).children('.' + _baseClass + 'button').addClass('disabled');
			}
		};

		// private methods
		function _onClick(e) { // executed in clicked link context
			e.preventDefault();
			// check if the selection is in an element owned by the toolbar
			if (_disabled) {
				return;
			}
			var textArea;
			if (!that.global) {
				textArea = getCurrentTextArea();
				if (textArea && textArea.toolbar !== that.toolbar) {
					return;
				}
			}
			//var f;
			if (_commands.hasOwnProperty(that.command)) {
				_commands[that.command](that.attribute, textArea);
			} else {
				_commands.generic(that.command, that.attribute, textArea);
			}
		}
	};

	// ############## HELPER FUNCTIONS ##############
	function getCurrentElement() {
		return $(document.getSelection().anchorNode).closest('[data-name]')[0];
	}

	function getCurrentTextArea() {
		var element = $(document.getSelection().anchorNode).closest('[data-name]')[0];
		return element ? element.textArea : undefined;
	}
	function getSurroundingNode() {
		return window.getSelection().focusNode.parentElement;
	}

	var cancelledPaste = false;
	function preventFormattedPaste(element) {
		
		$(element).on('keydown', function (e) {
			if (e.ctrlKey && e.keyCode === 86) {
				if (isInList(element)) {
					cancelledPaste = true;
					alert('You cannot paste in lists!');
					return;
				}
				var savedRange = window.getSelection().getRangeAt(0);
				var pasteArea = $('<textarea style="position: absolute; top: -1000px; left: -1000px; opacity: 0;" id="paste-area"></textarea>');
				$('body').append(pasteArea);
				pasteArea.focus();
				setTimeout(function () {
					$(element).focus();
					var sel = window.getSelection();
					sel.removeAllRanges();
					sel.addRange(savedRange);
					document.execCommand('insertHtml', false, pasteArea.val().replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n+/g, '</p><p>'));
					pasteArea.remove();
				}, 1);
			}
		});
		$(element).on('paste', function (e) {
			e.preventDefault();
			if (!cancelledPaste) alert('Unformatted paste is not allowed! Use CTRL+V to paste!');
			cancelledPaste = false;
		});
	}

	function preventTextOutsideParagraph(selectorOrObject) {
		var keydownBefore = false;
		$(selectorOrObject).on('keydown', function () {
			keydownBefore = true;
		});
		$(selectorOrObject).on('DOMNodeInserted', function (e) {
			if (e.target === this && keydownBefore) {
				wrapEmptyTextNodes(this);
			}
			keydownBefore = false;
		});
	}

	function turnOffNewLine(element) {
		$(element).keypress(function (e) {
			if (e.keyCode === 10 || e.keyCode === 13) e.preventDefault();
		});
	}

	function cleanup(el) {
		wrapEmptyTextNodes(el);
	}

	function wrapEmptyTextNodes(el) {
		var contents = $(el).contents();
		contents.filter(function () { return this.nodeType === 3; }).wrap('<p></p>');
		contents.filter('br').remove();
		setCaretAtEndOfElement($(el).find('p').last()[0]);
	}

	function isInList(element) {
		var listTags = ['ul', 'ol'];
		return intersectsTags(listTags, element);
	}
	function intersectsTags(tags, element) {
		var nodes = getContainedNodes(element, true);
		for (var i = 0; i < nodes.length; i++) {
			if (tags.indexOf(nodes[i].nodeName.toLowerCase()) > -1) {
				return true;
			}
		}
		return false;
	}

	function getContainedNodes(element, partlyContained) {
		partlyContained = partlyContained || false;
		var sel = window.getSelection();
		var nodes;
		if (sel.containsNode) {
			nodes = [];
			$(element).find('*').each(function () {
				if (sel.containsNode(this, partlyContained)) {
					nodes.push(this);
				}
			});
		} else {
			var anchorNode = getElementChild(sel.anchorNode, element);
			var focusNode = getElementChild(sel.focusNode, element);
			console.log(anchorNode);
			console.log(focusNode);
			if (anchorNode === focusNode) {
				nodes =  $(anchorNode).add($(anchorNode).find('*')).get();
			} else {
				var $children = $(element).children();
				var one = $children.index(anchorNode);
				var two = $children.index(focusNode);
				nodes = $children.slice(Math.min(one, two), Math.max(one, two)).get();
			}
		}
		console.log(nodes);
		return nodes;
	}

	// traverses up the DOM. returns 
	function getElementChild(node, element) {
		if (node === null || node === element || node.nodeName.toLowerCase() === 'body') {
			return null;
		} else if ($(element).children().index(node) > -1) {
			return node;
		} else {
			return getElementChild(node.parentNode, element);
		}
	}


	function selectNodes(nodes) {
		var sel = window.getSelection();
		var range = document.createRange();
		range.setStartBefore(_.first(nodes));
		range.setEndAfter(_.last(nodes));
		sel.removeAllRanges();
		sel.addRange(range);
	}
	function selectNodeContents(el) {
		var range = document.createRange();
		range.selectNodeContents(el);
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}

	function setCaretAtEndOfElement(element) {
		var range = document.createRange();
		if (element.childNodes.length > 0) {
			if (_.last(element.childNodes).nodeName.toLowerCase() === 'br') {
				range.setStartBefore(_.last(element.childNodes));
				range.setEndBefore(_.last(element.childNodes));
			} else {
				range.setStartAfter(_.last(element.childNodes));
				range.setEndAfter(_.last(element.childNodes));
			}
		} else {
			range.setStartAfter(element);
			range.setEndAfter(element);
		}
		var selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}
	function getBrowser() {
		var matches = window.navigator.userAgent.match(/(chrome|firefox)\/(\d*)/i);
		if (matches.length > 0) {
			return { name: matches[1].toLowerCase(), version: parseInt(matches[2]) };
		}
		matches = window.navigator.userAgent.match(/rv:(\d*)/i);
		if (matches.length > 0) {
			return { name: 'ie', version: parseInt(matches[1]) };
		}

	}
	function checkBrowser() {
		switch (browser.name.toLowerCase()) {
			case 'chrome':
				return browser.version >= 34;
			case 'firefox':
				return browser.version > 28;
			case 'ie':
				return browser.version === 11;
			default:
				return false;
		}
	}
		

	window.SpyText = SpyText;
};


// Initialize SpyText so it can be used both with requirejs and as a standalone
if (typeof define !== 'undefined') {
	define(['jquery', 'lodash'], mainFunction);
} else {
	mainFunction($, _);
}
