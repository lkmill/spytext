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
			}
			document.execCommand('formatBlock', null, attribute);
		},
		generic: function (command, attribute, element) {
			document.execCommand(command, null, attribute);
		},
		indent: function (attribute, element) {
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
		list: function (attribute, element) {
			var tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
			if (selectron.intersectsTags(tags, element)) {
				alert('You cannot make lists out of headings!');
				return;
			}
			if (attribute === 'ol') {
				document.execCommand('insertOrderedList');
			} else if (attribute === 'ul') {
				document.execCommand('insertUnorderedList');
			}
		},
		removeFormat: function (attribute, element) {
			document.execCommand('removeFormat');
		},
		showHtml: function (attribute, element) {
			alert(getCurrentElement().html());
		},
		showImageDialog: function (attribute, element) {
			//console.log('showImageDialog');
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
			if (browser.name === 'chrome') {
				_.each(document.querySelectorAll('p.spytext-generated'), function (el) {
					if (window.getSelection().focusNode !== el && $(el).text() === '') {
						$(this).remove();
					}
				});
                $(document.querySelector('body'));
			}
		}
    };
    var execute = function(command, attribute, element) {
        if (commands.hasOwnProperty(command)) {
            commands[command](attribute, element);
        } else {
            commands.generic(command, attribute, element);
        }
    };
	var preventFormattedPaste = function(element) {
		$(element).on('keydown', function (e) {
			if (e.ctrlKey && e.keyCode === 86) {
                var listTags = ['ul', 'ol'];
                if (selectron.intersectsTags(listTags, element)) {
					cancelledPaste = true;
					alert('You cannot paste in lists!');
					return;
				}
				var savedRange = window.getSelection().getRangeAt(0);
				var $pasteArea = $('<textarea style="position: absolute; top: -1000px; left: -1000px; opacity: 0;" id="paste-area"></textarea>');
				$(document.querySelector('body')).append($pasteArea);
				$pasteArea[0].focus();
				setTimeout(function () {
					element.focus();
					var sel = window.getSelection();
					sel.removeAllRanges();
					sel.addRange(savedRange);
					document.execCommand('insertHtml', false, $pasteArea[0].value.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n+/g, '</p><p>'));
					$pasteArea.remove();
				}, 1);
			}
		});
		$(element).on('paste', function (e) {
			e.preventDefault();
			if (!cancelledPaste) alert('Unformatted paste is not allowed! Use CTRL+V to paste!');
			cancelledPaste = false;
		});
	};
	var preventTextOutsideParagraph = function(selectorOrObject) { var keydownBefore = false;
		$(selectorOrObject).on('keydown', function () {
			keydownBefore = true;
		});
		$(selectorOrObject).on('DOMNodeInserted', function (e) {
			if (e.target === this && keydownBefore) {
				wrapEmptyTextNodes(this);
			}
			keydownBefore = false;
		});
	};
	var turnOffNewLine = function(element) {
		$(element).on('keypress', function (e) {
			if (e.keyCode === 10 || e.keyCode === 13) e.preventDefault();
		});
	};
	var cleanUp = function(el) {
		wrapEmptyTextNodes(el);
	};
	var wrapEmptyTextNodes = function(el) {
		var contents = $(el).contents();
		contents.filter(function () { return this.nodeType === 3; }).wrap('<p></p>');
		contents.filter('br').remove();
		setCaretAtEndOfElement($(el).find('p').last()[0]);
	};
    return {
        cleanUp: cleanUp,
        turnOffNewLine: turnOffNewLine,
        wrapEmptyTextNodes: wrapEmptyTextNodes,
        preventFormattedPaste: preventFormattedPaste,
        preventTextOutsideParagraph: preventFormattedPaste,
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
        link: function(scope, $element,attributes) {
            $element.on('mousedown', function(e) {
                e.preventDefault();
            });
            scope.buttonGroups = [
                { name: 'undo', buttons: ['undo', 'redo']},
                { name: 'type', buttons: ['typeParagraph', 'typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6'] },
                { name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']},//,'color'],
                ['link'],
                { name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
                { name: 'list', buttons: ['listUnordered', 'listOrdered']},
                ['reset']
            ];
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
            $element.on('keyup', function() {
                if(!ngModelCtrl.$dirty && ngModelCtrl.$viewValue !== $element.html()) {
                    scope.$apply(function() {
                        ngModelCtrl.$setViewValue($element.html());
                    });
                }
            });
            $element.on('DOMNodeInserted', function (e) {
                var sel, rng, content;
                if (e.target === $element[0]) {
                    return;
                }
                var $parent = $(e.target).parent();
                var $newElement = $('<p class="spytext-generated"><br /></p>');
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
                        $element[0].focus();
                        sel.removeAllRanges();
                        rng = document.createRange();
                        rng.setStart($newElement[0], 0);
                        rng.setEnd($newElement[0], 0);
                        sel.addRange(rng);
                    }, 1);
                } else if (e.target.nodeName.toLowerCase() === 'span') {
                    if ($parent[0] === $element[0]) {
                        alert('oh my, span is child of the textArea!');
                        return;
                    }
                    selectron.setCaretAtEndOfElement($parent[0]);
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
                } else if ([ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].indexOf(e.target.nodeName) > -1 && $parent[0] !== $element[0]) {
                    // TODO check if parent is empty, delete if so.
                    $parent.after(e.target);
                    selectron.setCaretAtEndOfElement(e.target);
                }
            });
            ngModelCtrl.$render = function() {
                $element.html(ngModelCtrl.$viewValue);
            };
            Spytext.preventFormattedPaste($element[0]);
        }
    };
});
