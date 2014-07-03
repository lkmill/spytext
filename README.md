# Bower Spytext

> Front-end contenteditable

## Install

```sh
$ bower install --save spytext
```

## Usage

```

<script src="bower_components/jquery/dist/jquery.js"></script>
<script src="bower_components/lodash/dist/lodash.js"></script>
<script src="bower_components/rangy/rangy-core.js"></script>
<script src="bower_components/rangy/rangy-selectionsaverestore.js"></script>
<script src="bower_components/spytext/js/spytext.js"></script>
<link href="bower_components/font-awesome/css/font-awesome.css" rel="stylesheet">
<link href="stylesheets/screen.css" rel="stylesheet">

<h1>test</h1>

<div contenteditable="true" data-id="content_1">
    <p>test</p>
</div>

<h2>test</h2>

<div contenteditable="true" data-id="content_1">
    <br>
</div>

<script>
    $(function() {
        SpyText.addGroup($('div[contentEditable="true"]'));

        SpyText.addHooks({
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