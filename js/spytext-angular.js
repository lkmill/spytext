var module = angular.module('Spytext', []);

module.factory('Spytext', function($window) {
	return $window.Spytext;
})

// make two way binding work for contenteditable tags
.directive('spytextField', function() {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelCtrl) {
            element.attr('contenteditable', 'true');
            element.bind('keyup', function() {
                if(!ngModelCtrl.$dirty && ngModelCtrl.$viewValue !== element.html()) {
                    scope.$apply(function() {
                        ngModelCtrl.$setViewValue(element.html());
                    });
                }
            });
            element.bind('blur', function() {
                if(ngModelCtrl.$dirty) {
                    scope.$apply(function() {
                        ngModelCtrl.$setViewValue(element.html());
                    });
                }
            });

            ngModelCtrl.$render = function() {
                element.html(ngModelCtrl.$viewValue);
            };
        }
    };
})
.directive('spytextGroup', function(Spytext) {
    return {
        restrict: 'A',
        link: function(scope,elem,attrs) {
            Spytext.addGroup(elem);
        }
    };
});
