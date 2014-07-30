var $ = angular.element;
var buttonTypes = {
	alignCenter: { title: 'Align Center', command: 'align', attribute: 'center' },
	alignJustify: { title: 'Justify', command: 'align', attribute: 'full' },
	alignLeft: { title: 'Align Left', command: 'align', attribute: 'left' },
	alignRight: { title: 'Align Right', command: 'align', attribute: 'right' },
	bold: { title: 'Bold', command: 'bold'},
	indentLeft: { title: 'Outdent', command: 'outdent'},
	indentRight: { title: 'Indent', command: 'indent'},
	italic: { title: 'Italic', command: 'italic'},
	link: { title: 'Link', command: 'link'},
	listOrdered: { title: 'Ordered list', command: 'list', attribute: 'ol'},
	listUnordered: { title: 'Unordered list', command: 'list', attribute: 'ul'},
	redo: { title: 'Redo', command: 'redo', global: true },
	removeFormat: { title: 'Remove formatting', command: 'removeFormat'},
	strikeThrough: { title: 'Strikethrough', command: 'strikeThrough'},
	//type: {  title: 'Font type', text: 'Type', command: 'formatBlock', dropdown: [
	//	{ title: 'Paragraph', attribute: '<p>' },
	//	{ title: 'Heading 1', attribute: '<H1>' },
	//	{ title: 'Heading 2', attribute: '<H2>' },
	//	{ title: 'Heading 3', attribute: '<H3>' },
	//	{ title: 'Heading 4', attribute: '<H4>' },
	//	{ title: 'Heading 5', attribute: '<H5>' },
	//	{ title: 'Heading 6', attribute: '<H6>' }
	//	]},
	typeHeading1: { title: 'Heading 1', command: 'formatBlock', attribute: '<H1>' },
	typeHeading2: { title: 'Heading 2', command: 'formatBlock', attribute: '<H2>' },
	typeHeading3: { title: 'Heading 3', command: 'formatBlock', attribute: '<H3>' },
	typeHeading4: { title: 'Heading 4', command: 'formatBlock', attribute: '<H4>' },
	typeHeading5: { title: 'Heading 5', command: 'formatBlock', attribute: '<H5>' },
	typeHeading6: { title: 'Heading 6', command: 'formatBlock', attribute: '<H6>' },
	typeParagraph: { title: 'Paragraph', command: 'formatBlock', attribute: '<p>' },
	underline: { title: 'Underline', command: 'underline'},
	undo: { title: 'Undo', command: 'undo', global: true }
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
	var insertHtml = function(html) {
		console.log('insertHtml: ' + html);
		if(!document.execCommand('insertHTML', false, html)) {
			var rng = selectron.save();
			document.execCommand('delete', false);
			var nodes = document.createFromHtml(html);
			var l = (nodes instanceof NodeList) ? nodes.length : 1;
			if(l === 1) {
				rng.insertNode(nodes);
			} else {
				for(var i = l - 1; i >= 0; i--) {
					rng.insertNode(nodes[i]);
				}
			}
		}
	};
	var insertElement = function(html, element) {
		if(!(html instanceof Node || html instanceof NodeList)) return insertHtml(html);
		//if(typeof html === 'string') return insertHtmlString(html);
		//
		var l = html.length;
		if(l === 1) {
			html.id = 'zz';
		} else {
			html.addClass('zz');
		}
		if(document.execCommand('insertHTML', false, html.outerHtml())) {
			if(l === 1) {
				html = document.getElementById('zz');
			} else {
				html = MOD(document.getElementsByClassName('zz'));
			}
		} else {
			var rng = selectron.save();
			document.execCommand('delete', false);
			if(l === 1) {
				rng.insertNode(html);
			} else {
				for(var i = l - 1; i >= 0; i--) rng.insertNode(html[i]);
			}
		}
		html.attr({ class: null, id: null });
		html.each(function() {
			while(this.parentNode && this.parentNode !== element) {
				var p = this.parentNode;
				p.before(this);
				if(!p.firstChild) {
					p.remove();
				}
			}
		});
		return html;
	};
	var commands = {
		align: function (attribute, element) {
			var listTags = ['ul', 'ol'];
			if (selectron.intersectsTags(listTags, element)) {
				alert('You cannot align lists!');
			} else {
				var command = 'justify' + attribute.charAt(0).toUpperCase() + attribute.slice(1).toLowerCase();
				document.execCommand(command);
			}
		},
		formatBlock: function (attribute, element) {
			var listTags = ['ul', 'ol', 'li'];
			var blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];

			var contained = selectron.getContainedChildElements(element, true);
			if(contained.length > 1) {
				alert('You can only format one block at a time!');
			} else if(contained.exists(listTags.join(', '))) {
				alert('You cannot set type of lists!');
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
		},
		list: function (attribute, element) {
			// TODO check if already in a list
			var containedChildren = selectron.getContainedChildElements(element, true);
				
			var list, tag;
			// TODO concat to existing list if list and other blocks are selected
			if(containedChildren.exists('ul, ol')) {
				list = [];
				tag = 'p';
				containedChildren = containedChildren.childs();
			} else {
				list = MOD('<' + attribute + '></' + attribute + '>');
				tag = 'li';
			}
			containedChildren.each(function() {
				var item = MOD('<' + tag + '>' + this.textContent + '</' + tag + '>');
				if(list instanceof Array) list.push(item);
				else list.append(item);
			});
			selectron.selectNodes(containedChildren);
		
			list = insertElement(MOD(list), element);

			selectron.setCaretAtEndOfElement(list);
		},
		link: function (attribute, element) {
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
		insertElement: insertElement,
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
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					switch(mutation.type) {
						case 'childList':
							console.log(mutation.addedNodes);
							console.log(mutation.removedNodes);
							//console.log(mutation.previousSibling);
							//console.log(mutation.nextSibling);
							//DOMNode
							if(undoOn) addToUndo(mutation);
							break;
						case 'characterData':
							console.log('characterData being handled');
							break;
					}
				});    
			});
			 
			// configuration of the observer:
			var config = { subtree: true, childList: true, characterData: true };
			 
			// pass in the target node, as well as the observer options
			 
			function toggleUndo() {
				if(undoOn) observer.disconnect();
				else observer.observe($element[0], config);
				undoOn = !undoOn;
			}
			function addToUndo(mutation) {
				var addedNodes = [];
				_.each(mutation.addedNodes, function(node) {
					addedNodes.push({ target: node, next: node.nextSibling, prev: node.previousSibling, parent: node.parentNode });
				});
				var removedNodes = [];
				_.each(mutation.removedNodes, function(node) {
					var next = mutation.nextSibling;
					var prev = mutation.previousSibling;
					removedNodes.push({ target: node, next: next, prev: prev, parent: mutation.target });
				});
				var obj = { addedNodes: addedNodes, removedNodes: removedNodes};
				console.log('added: ' + addedNodes.length + ' removed: ' + removedNodes.length);
				undoStack.push(obj);
				undoIndex = undoStack.length -1;
			}
			function undoRedo(u, undo) {
				var addNodes = undo ? u.removedNodes : u.addedNodes;
				var removeNodes = undo ? u.addedNodes : u.removedNodes;
				toggleUndo();
				for(var i in removeNodes) {
					removeNodes[i].target.remove();
				}
				for(var j = addNodes.length - 1; j >= 0; j--) {
				//for(var j = 0; j < addNodes.length ; j++) {
					var node = addNodes[j];
					if (node.next) {
						node.parent.insertBefore(node.target, node.next);
					} else {
						node.parent.append(node.target);
					}
				}
				toggleUndo();
			}
			function undo() {
				if(undoOn && undoIndex >= 0) {
					undoRedo(undoStack[undoIndex], true);
					undoIndex--;
				} else {
					console.log('undo: nothing to do');
					console.log(undoIndex);
				}

			}
			function redo() {
				if(undoOn && undoIndex < undoStack.length - 1) {
					undoIndex++;
					undoRedo(undoStack[undoIndex], false);
				} else {
					console.log('redo: nothing to do');
					console.log(undoIndex);
				}
			}
			scope.elements.push($element[0]);
			var commands = fieldPresets[attributes.stFieldPreset].commands;
			var fixing = false;
			var undoStack = [];
			var undoIndex = undoStack.length - 1;
			var undoOn = false;
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
				if (e.ctrlKey) {
					if(e.keyCode === 89) {
						e.preventDefault();
						redo();
						//Spytext.execute('redo', null, $element[0]);
					} else if(e.keyCode === 90) {
						e.preventDefault();
						undo();
						//Spytext.execute('undo', null, $element[0]);
					} else if(e.keyCode === 65) {
						e.preventDefault();
						selectron.selectNodeContents($element[0]);
					} else if(e.keyCode === 86) {
						console.log('is pasting');
						var listTags = ['ul', 'ol', 'li'];
						if (selectron.intersectsTags(listTags, $element[0])) {
							alert('You cannot paste in lists!');
							return;
						}
						var sel = window.getSelection();
						var savedRange = selectron.save();
						var pasteArea = MOD('<textarea style="position: absolute; top: -1000px; left: -1000px; opacity: 0;" id="paste-area"></textarea>');
						document.body.append(pasteArea);
						pasteArea.focus();
						console.log('timing out');
						setTimeout(function () {
							$element[0].focus();
							selectron.restore(savedRange);
							var str = unescape(pasteArea.value.trim());
							str = str.split('\u2022').join('');
							str = str.replace(/\n+/g, '</p><p>');
							pasteArea.remove();
							console.log('calling');
							Spytext.insertHtml(str);
						}, 1);
					}
				}
			});
			$element.on('paste', function (e) {
				console.log('paste event');
				e.preventDefault();
			});
			ngModelCtrl.$render = function() {
				$element.html(ngModelCtrl.$viewValue);
			};
			toggleUndo();
		}
	};
});
