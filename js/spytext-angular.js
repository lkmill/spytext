var $ = angular.element;
var buttonTypes = {
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
	typeParagraph: { title: 'Paragraph', command: 'formatBlock', attribute: '<p>' },
	typeHeading1: { title: 'Heading 1', command: 'formatBlock', attribute: '<H1>' },
	typeHeading2: { title: 'Heading 2', command: 'formatBlock', attribute: '<H2>' },
	typeHeading3: { title: 'Heading 3', command: 'formatBlock', attribute: '<H3>' },
	typeHeading4: { title: 'Heading 4', command: 'formatBlock', attribute: '<H4>' },
	typeHeading5: { title: 'Heading 5', command: 'formatBlock', attribute: '<H5>' },
	typeHeading6: { title: 'Heading 6', command: 'formatBlock', attribute: '<H6>' },
	bold: { title: 'Bold', icon: 'bold', command: 'bold'},
	italic: { title: 'Bold', icon: 'bold', command: 'italic'},
	underline: { title: 'Underline', icon: 'underline', command: 'underline'},
	strikeThrough: { title: 'Strikethrough', icon: 'strikethrough', command: 'strikeThrough'},
	removeFormat: { title: 'Remove formatting', icon: 'eraser', command: 'removeFormat'},
	link: { title: 'Link', icon: 'link', command: 'showLinkDialog'},
	alignLeft: { title: 'Align Left', icon: 'align-left', command: 'align', attribute: 'left' },
	alignCenter: { title: 'Align Center', icon: 'align-center', command: 'align', attribute: 'center' },
	alignRight: { title: 'Align Right', icon: 'align-right', command: 'align', attribute: 'right' },
	alignJustify: { title: 'Justify', icon: 'align-justify', command: 'align', attribute: 'full' },
	listUnordered: { title: 'Unordered list', icon: 'list-ul', command: 'list', attribute: 'ul'},
	listOrdered: { title: 'Ordered list', icon: 'list-ol', command: 'list', attribute: 'ol'},
	indentRight: { title: 'Indent', icon: 'indent', command: 'indent'},
	indentLeft: { title: 'Unindent', icon: 'outdent', command: 'outdent'},
	image: { title: 'Image', icon: 'picture', command: 'showImageDialog'},
	html: { title: 'Show html', icon: 'code', command: 'showHtml'},
	reset: { title: 'Reset', icon: 'backward', command: 'reset' },
	save: { title: 'Save', icon: 'save', command: 'save', global: true }
};
var fieldDefaults = {
	preset: 'format',
	preventFormattedPaste: true,
	preventTextOutsideParagraph: true
};
var fieldPresets = {
	full: {
		commands: [
			'undo', 'redo',
		'typeParagraph', 'typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6',
		//'type',
		'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat',
		'link',
		'alignLeft', 'alignCenter', 'alignRight', 'alignJustify',
		'listOrdered', 'listUnordered',
		'indentRight', 'indentLeft',
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
};

angular.module('Spytext', [])

.factory('Spytext', function() {
	function getBrowser() {
		var matches = window.navigator.userAgent.match(/(chrome|firefox)\/(\d*)/i);
		if (matches && matches.length > 0) {
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
	var browser = getBrowser();
	if (!checkBrowser()) {
		alert('you are using an unsuppported browser');
		return;
	}
	var clearEmptyElements = function(element) {
		_.each(element.querySelectorAll('p.spytext-generated'), function (el) {
			if (window.getSelection().focusNode !== el && $(el).text() === '') {
				$(el).remove();
			}
		});
	};
	var insertHtml = function(html, selectAll, element) {
		if(!document.execCommand('insertHTML', false, html)) {
			var node;
			if(!html.match(/^</)) {
				node = document.createTextNode(html);
			} else {
				node = $(html)[0];
			}
			var range = window.getSelection().getRangeAt(0);
			document.execCommand('delete', false);
			range.insertNode(node);
			var currentNode = selectron.getAnchorAncestorElement('[spytext-field] > *');
			if(selectAll) {
				// IE sets caret in weird positions... fix with this
				selectron.setCaretAtEndOfElement(node.children.length > 0 ? _.last(node.children) : node);
			} else {
				selectron.setCaretAtEndOfElement(node.children.length > 0 ? _.last(node.children) : node);
			}
		}
	};
	var preventFormattedPaste = function(element) {
		$(element).on('keydown', function (e) {
			if (e.ctrlKey && e.keyCode === 86) {
				var listTags = ['ul', 'ol', 'li'];
				if (selectron.intersectsTags(listTags, element)) {
					alert('You cannot paste in lists!');
					return;
				}
				var sel = window.getSelection();
				var savedRange = sel.getRangeAt(0);
				var $pasteArea = $('<textarea style="position: absolute; top: -1000px; left: -1000px; opacity: 0;" id="paste-area"></textarea>');
				$(document.querySelector('body')).append($pasteArea);
				$pasteArea[0].focus();
				setTimeout(function () {
					element.focus();
					sel.removeAllRanges();
					sel.addRange(savedRange);
					insertHtml($pasteArea[0].value.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n+/g, '</p><p>'));
					$pasteArea.remove();
				}, 1);
			}
		});
		$(element).on('paste', function (e) {
			e.preventDefault();
		});
	};
	var turnOffNewLine = function(element) {
		$(element).on('keypress', function (e) {
			if (e.keyCode === 10 || e.keyCode === 13) e.preventDefault();
		});
	};
	var commands = {
		align: function (attribute, element) {
			var listTags = ['ul', 'ol'];
			if (selectron.intersectsTags(listTags, element)) {
				alert('You cannot align lists!');
				return;
			}
			var command = 'justify' + attribute.charAt(0).toUpperCase() + attribute.slice(1).toLowerCase();
			document.execCommand(command);
		},
		formatBlock: function (attribute, element) {
			var listTags = ['ul', 'ol'];
			if (selectron.intersectsTags(listTags, element)) {
				alert('You cannot set type of lists!');
				return;
			} else if(selectron.getContainedChildElements(element, true).length > 1) {
				// TODO check which browsers incorrectly format
				alert('You can only format one block at a time!');
			} else {
				document.execCommand('formatBlock', false, attribute);
			}
		},
		generic: function (command, attribute, element) {
			document.execCommand(command, false, attribute);
		},
		indent: function (attribute, element) {
			// TODO see if we can get this to work
			var tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
			var listTags = ['ul', 'ol', 'li'];
			if (selectron.intersectsTags(tags, element) || !selectron.intersectsTags(listTags, element)) {
				alert('You can only indent lists!');
				return;
			}
			var currentLiElement = selectron.getContainingElement('li');
			var previousLiElement = currentLiElement.previousSibling;
			if(!previousLiElement) {
				alert('you cannot indent the first item in a list');
				return;
			}
			var listElement = selectron.getContainingElement('ul, ol');
			var listType = listElement.tagName.toLowerCase();

			var $list = $('<' + listType + '></' + listType + '>');
			// TODO if we get it to work, loop through all <LI> instead of just one
			var $li = $('<li>' + currentLiElement.textContent + '</li>');
			$list.append($li);

			//insertHtml($list[0].outerHTML, false);
			previousLiElement.appendChild($list[0]);
			selectron.setCaretAtEndOfElement($list[0]);
			currentLiElement.remove();
		},
		outdent: function(attribute, element) {
			//TODO implement
			//
		},
		list: function (attribute, element) {
			// TODO check if already in a list
			var sel = window.getSelection();
			var collapsed = sel.isCollapsed;
			var containedChildren = selectron.getContainedChildElements(element, true);
			sel.removeAllRanges();
			var $list = $('<' + attribute + '></' + attribute + '>');
			_.each(containedChildren, function(child) {
				if(child) {
					var $li = $('<li>' + child.textContent + '</li>');
					$list.append($li);
				}
			});
			var range = document.createRange();
			range.setStartBefore(_.first(containedChildren));
			range.setEndAfter(_.last(containedChildren));
			sel.addRange(range);
			insertHtml($list[0].outerHTML, !collapsed);
			var containing = selectron.getContainingElement('h1, h2, h3, h4, h5, h6, p');
			if(containing) {
				var list = containing.firstChild;
				containing.after(list);
				containing.remove();
				selectron.setCaretAtEndOfElement(list);
			}
		},
		removeFormat: function (attribute, element) {
			document.execCommand('removeFormat');
		},
		showHtml: function (attribute, element) {
			alert(getCurrentElement().html());
		},
		showImageDialog: function (attribute, element) {
		},
		showLinkDialog: function (attribute, element) {
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
		undo: function (attribute, element) {
			document.execCommand('undo');
			clearEmptyElements(element);
			element.normalize();
		}
	};
	var execute = function(command, attribute, element) {
		if (commands.hasOwnProperty(command)) {
			commands[command](attribute, element);
		} else {
			commands.generic(command, attribute, element);
		}
	};
	return {
		insertHtml: insertHtml,
		turnOffNewLine: turnOffNewLine,
		preventFormattedPaste: preventFormattedPaste,
		execute: execute
	};
})

.filter('dashes', function() {
	return function(input) {
		var REGEXP = /[A-Z1-9]/g;
		var SEPARATOR = '-';
		return input.replace(REGEXP, function(letter, pos) {
			return (pos ? SEPARATOR : '') + letter.toLowerCase();
		});
	};
})
.directive('spytext', function($compile, Spytext) {
	return {
		restrict: 'A',
		controller: function($scope, $element) {
			$scope.elements = [];
			$scope.buttons = [];
			$scope.activateButtons = function(buttons) {
				_.each($scope.buttons, function(buttonElement) {
					if(buttons.indexOf(buttonElement.name) > -1) {
						buttonElement.disabled = false;
					}
				});
			};
			$scope.deactivateButtons = function() {
				_.each($scope.buttons, function(buttonElement) {
					if($(buttonElement).attr('global') !== 'true') {
						buttonElement.disabled = true;
					}
				});
			};
			$scope.buttonClick = function(e, buttonProperties) {
				e.preventDefault();
				var element = selectron.getContainingElement('[spytext-field]');
				if(buttonProperties.global || (element && $scope.elements.indexOf(element) > -1)) {
					Spytext.execute(buttonProperties.command, buttonProperties.attribute, element);
					if(element) element.focus();
				} else {
					alert('Element does not belong to Spytext!');
				}
			};
		},
		link: function(scope, $element, attributes) {
			$element.prepend($compile('<spytext-toolbar></spytext-toolbar>')(scope));
		}
	};
})
.directive('spytextToolbar', function() {
	return {
		restrict: 'AE',
		template: '<div class="spytext-toolbar">' + 
		'<ul ng-repeat="group in buttonGroups" class="spytext-button-group"  ng-class="group.name">' +
		'<li ng-repeat="button in group.buttons"><spytext-button st-button-type="{{ button }}"></spytext-button></li>' +
		'</ul>' +
		'</div>',
		replace: true,
		controller: function($scope) {
			$scope.buttonGroups = [
				{ name: 'undo', buttons: ['undo', 'redo']},
				{ name: 'type', buttons: ['typeParagraph', 'typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6'] },
				{ name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']},//,'color'],
				['link'],
				{ name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
				{ name: 'list', buttons: ['listUnordered', 'listOrdered']},
				{ name: 'indent', buttons: ['indentRight', 'indentLeft']},
				['reset']
			];
		},
		link: function(scope, $element,attributes) {
			$element.on('mousedown', function(e) {
				e.preventDefault();
			});
		}
	};
})
.directive('spytextButton', function(Spytext) {
	return {
		restrict: 'AE',
	template: '<button ng-click="buttonClick($event, buttonProperties)" title="{{ buttonProperties.title }}" class="spytext-button" ng-class="buttonType | dashes" tabindex="-1"><span>{{ buttonProperties.title }}</span></button>',
	replace: true,
	link: function(scope, $element, attributes) {
		scope.buttons.push($element[0]);
		scope.buttonType = attributes.stButtonType;
		scope.buttonProperties = buttonTypes[attributes.stButtonType];
		$element.attr('name', attributes.stButtonType);
		$element.attr('global', (scope.buttonProperties.global ? 'true' : 'false'));
		if(!scope.buttonProperties.global) {
			$element[0].disabled = true;
		}

	}
	};
})
.directive('spytextField', function(Spytext) {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, $element, attributes, ngModelCtrl) {
			scope.elements.push($element[0]);
			var commands = fieldPresets[attributes.stFieldPreset].commands;
			var fixing = false;
			$element.attr('contenteditable', 'true');
			$element.on('focus', function () {
				scope.activateButtons(commands);
			});
			$element.on('blur', function () {
				scope.deactivateButtons();
				if(ngModelCtrl.$dirty) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue($element.html());
					});
				}
			});
			$element.on('keydown', function(e) {
				if(!ngModelCtrl.$dirty && ngModelCtrl.$viewValue !== $element.html()) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue($element.html());
					});
				}
			});
			$element.on('keyup', function (e) {
				if (e.ctrlKey) {
					if(e.keyCode === 89) {
						e.preventDefault();
						Spytext.execute('redo', null, $element[0]);
					} else if(e.keyCode === 90) {
						e.preventDefault();
						Spytext.execute('undo', null, $element[0]);
					}
				}
			});
			$element.on('DOMNodeInserted', function (e) {

				var sel = window.getSelection();
				var content = e.target.textContent !== '' ? e.target.textContent : '<br />';
				var parentNode = e.target.parentNode;

				if (parentNode === $element[0]) {
					if(e.target.nodeType === 3 || e.target.nodeName.toLowerCase() === 'div') {
						fixing = true;
						var p = $('<p class="spytext-generated"><br /></p>')[0];
						$(e.target).after(p);
						sel.selectAllChildren(p);
						Spytext.insertHtml(content);
						$(e.target).remove();
						// ask me not why this has to be in a timeout
						setTimeout(function () {
							selectron.setCaretAtEndOfElement(p);
						} , 1);
					}
				} else if (e.target.nodeName.toLowerCase() === 'span') {
					$(e.target).remove();
					
					// this (fake) timeout is needed to trick Chrome into allowed nested execCommand when pasting
					setTimeout(function() {
						savedRng = sel.getRangeAt(0);
						selectron.setCaretAtEndOfElement(parentNode);
						document.execCommand('insertText', false, content);
						// ask me not why this has to be in a timeout
						setTimeout(function() {
							sel.removeAllRanges();
							sel.addRange(savedRng);
						}, 1);
					});
				}
				if(!fixing && e.target.nodeType === 1) {
					e.target.removeAttribute('style');
					e.target.removeAttribute('class');
				}
				fixing = false;
			});
			ngModelCtrl.$render = function() {
				$element.html(ngModelCtrl.$viewValue);
			};
			Spytext.preventFormattedPaste($element[0]);
		}
	};
});
