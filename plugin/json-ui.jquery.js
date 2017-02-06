  // Define a jquery plugin that makes a textarea editable via modal form.  
  (function( $ ) {

    function jsonFromForm($form) {
      var $fieldset = $form.children("fieldset").first();
      var jsonObject = dataFromFieldset($fieldset);
      return JSON.stringify(jsonObject);
    }

    function dataFromFieldset($fieldset) {
      var serializeAs = $fieldset.data("serialize-as");
      var jsonObject = null;

      switch(serializeAs) {
        case "object":
          jsonObject = {};
          var $children = $fieldset.children("fieldset");
          $children.each(function(index, fieldset) {
            var $fieldset = $(fieldset);
            var label = $fieldset.data("serialize-label");
            jsonObject[label] = dataFromFieldset($fieldset);
          });

          break;
        case "array":
          jsonObject = [];
          var $children = $fieldset.children("fieldset");
          $children.each(function(index, fieldset) {
            var $fieldset = $(fieldset);
            jsonObject.push(dataFromFieldset($fieldset));
          });

          break;
        case "primitive":
          var $child = $fieldset.children("input").first();
          jsonObject = $child.val();
          if(jsonObject != "" && !isNaN(jsonObject))
            jsonObject = parseFloat(jsonObject);
          break;
      }
      return jsonObject;
    }

    function formFromJson(json) {
      var $form = $("<form>")
        .addClass("form-horizontal");

      var parsed = $.parseJSON(json);
      
      if(Array.isArray(parsed)) {
        var $fields = fieldsFromArray(parsed);
        $form.append($fields);
      } else {
        var $fields = fieldsFromObject(parsed);
        $form.append($fields);
      }

      return $form;
    }

    function fieldsFromArray(arr, label) {
      var $fieldset = $("<fieldset/>")
        .addClass("array")
        .data("serialize-as", "array")
        .data("serialize-label", label);

      if(label) {
        var $legend = $("<legend>")
          .text(label)
          .appendTo($fieldset);
      }

      var replicate = null;
      for(var x in arr) {
        var item = arr[x];
        if((!!item) && (item.constructor === Object)) {
          // This is an object
          var $fields = fieldsFromObject(item);
          var $remove = getDeleteButton($fields);
          replicate = $fields;
          $fields.append($remove);
          $fieldset.append($fields);
        } else if(Array.isArray(item)) {
          // This is an array
          var $fields = fieldsFromArray(item, "list");
          var $remove = getDeleteButton($fields);
          replicate = $fields;
          $fields.append($remove);
          $fieldset.append($fields);
        } else {
          // This is a primitive
          var $fields = fieldFromPrimitive(item);
          var $remove = getDeleteButton($fields);
          replicate = $fields;
          $fields.append($remove);
          $fieldset.append($fields);
        }
      }
      var $replicate = getReplicatorButton(replicate);
      $fieldset.append($replicate);
      return $fieldset;
    }

    function fieldsFromObject(obj, label) {
      var $fieldset = $("<fieldset/>")
        .addClass("object")
        .data("serialize-as", "object")
        .data("serialize-label", label);

      var $legend = $("<div>")
        .addClass("object-label")
        .text(label)
        .appendTo($fieldset);

      for(var x in obj) {
        var item = obj[x];
        if((!!item) && (item.constructor === Object)) {
          // This is an object
          var $fields = fieldsFromObject(item);
          $fieldset.append($fields);
        } else if(Array.isArray(item)) {
          // This is an array
          var $fields = fieldsFromArray(item, x);
          $fieldset.append($fields);
        } else {
          // This is a primitive
          var $field = fieldFromPrimitive(item, x);
          $fieldset.append($field);
        }
      }

      return $fieldset;
    }

    function fieldFromPrimitive(value, label) {
      var $fieldset = $("<fieldset/>")
        .addClass("primitive")
        .data("serialize-as", "primitive")
        .data("serialize-label", label);

      if(label) {
        var $legend = $("<label>")
          .text(label+":")
          .appendTo($fieldset);
      }

      var $input = $("<input>")
        .attr("type", "text")
        .val(value)
        .appendTo($fieldset);

      return $fieldset;
    }

    function getReplicatorButton($fieldset) {
      var $button = $("<button>")
        .text("+")
        .addClass("replicate-button")
        .click(function() {
          // Create the clone
          var $newFieldset = $fieldset.clone(true);

          // Clear the values
          $newFieldset.find("input")
            .val("");

          // Replace buttons
          var $replicatorButtons = $newFieldset.find(".replicate-button");
          $replicatorButtons.each(function(index, button) {
            var $button = $(button);
            $button.replaceWith(getReplicatorButton($button.parent().children("fieldset").first()));
          });
          var $replicatorButtons = $newFieldset.find(".delete-button");
          $replicatorButtons.each(function(index, button) {
            var $button = $(button);
            $button.replaceWith(getDeleteButton($button.parent()));
          });

          // Add the new fieldset
          $newFieldset.insertBefore($button);
          return false;
        });
      return $button;
    }

    function getDeleteButton($fieldset) {
      var $button = $("<button>")
        .text("x")
        .addClass("delete-button")
        .click(function() {
          $fieldset.remove();
          return false;
        })
      return $button;
    }

    $.fn.jsonFormEditor = function(action, settings) {

      // Loop through every item targeted
      return this.each(function() {

        // Lock in a jquery version of the target element
        var $this = $(this);

        // Run the specified action
        if(action == "init") {

          // Add in a trigger button
          var $button = $("<button>")
            .text("Edit JSON")
            .click(function() {
              $this.jsonFormEditor("open");
              return false;
            })
            .insertAfter($this);

          // Add a modal box
          var $modal = $("<div/>")
            .insertAfter($this);

          // Add a space for the form
          var $slot = $("<div/>")
            .addClass("json-ui-form")
            .appendTo($modal);

          $this.data("json-ui-modal", $modal);

          $modal.dialog({
            autoOpen: false,
            modal: true,
            width: 500,
            buttons: {
              "Finished": function() {
                $this.jsonFormEditor("close");
                $modal.dialog( "close" );
              },
              Cancel: function() {
                $modal.dialog( "close" );
              }
            },
            close: function() {}
          });
        }

        if(action == "open") {
          // Load the JSON
          var json = $this.val();

          // Create a form based on the JSON values
          var $form = formFromJson(json);

          // Launch the modal
          var $modal = $this.data("json-ui-modal");
          $modal.find(".json-ui-form")
            .empty()
            .append($form);

          $modal.dialog("open");
        }

        if(action == "close") {
          var $modal = $this.data("json-ui-modal");
          var $form = $modal.find(".json-ui-form>form");
          var json = jsonFromForm($form);
          $this.val(json);
        }

      });
    }
  }( $ ));