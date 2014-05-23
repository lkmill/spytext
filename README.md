# Bower Cedit

> Front-end contenteditable

## Install

```sh
$ bower install --save bower-tcb-cedit
```

## Usage

```
<script src="/bower_components/lodash/lodash.js"></script>
<script src="/bower_components/rangy/rangy-core.js"></script>
<script src="/bower_components/rangy/rangy-selectionsaverestore.js"></script>
<script src="/bower_components/cedit/cedit.js"></script>
<link href="/bower_components/font-awesome/css/font-awesome.css" rel="stylesheet">

<script>
	$(function() {
		var t = Cedit.createToolbar({mode: "defaultTop"});
		Cedit.addElements($('div[contentEditable="true"]'), {mode: "simple"});

		Cedit.addHooks({
			save: function(elements, callback){
				var data = _.map(elements, function(el) { return { 
					id: $(el).attr("data-id"),
					html: $(el).html()
				}});
				$.ajax({
					method: 'post',
					url: "demo_test.txt",
					format: "json",
					data: {data: data},
					success: function(result){
						callback(result);
					},
					error: function(result){
						callback(result);
					}
				});
			},
			remove: function(elements, callback){
				var data = _.invoke(elements, function(){ return $(this).attr("data-id"); });
				$.ajax({
					method: 'post',
					url: "demo_test.txt",
					format: "json",
					data: {data: data},
					success: function(result){
						callback(result);
					},
					error: function(result){
						callback(result);
					}
				});
			},
		});
	});
</script>
```

## Hooks
```
	save: function(elements, callback)
	remove: function(elements, callback)
```