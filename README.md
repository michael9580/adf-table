adf-table
=========

AngularJS DreamFactory table component

I'm going to give the basics.  I'm still working...in Beta.  Things may change without warning.



bower install adf-table or clone and link the js and css yourself.  It has to exist in 'bower_components/adf-table'.



### Including the module

```javascript

// Angular Module Definition

angular.module('YOUR_MAIN_APP_MODULE', ['dfTable'])

// We need to set a constant to keep track of your DSP_URL
// We'll use it through out the app.
.constant('DSP_URL', YOUR_DSP_URL)



// continue with app definition

```



###Simple usage.
This will build a paginated table from your data service with a DSP.  Inside your controller for the route create a
$scope.options object as shown below.


```javascript
$scope.options = {

        // the service and table may seem redundant here but
        // we need these inside dfTable
        service: YOUR_DATA_SERVICE_HERE,
        table: YOUR_TABLE_HERE,
        url: DSP_URL + '/rest/' + this.service + '/' + this.table,
    };
```

Put this in your view/template for the route

```html

<df-table data-options="options"></df-table>

```


That should be it.  Now when you go to that route the table will load your data and paginate and build forms for editing
that table data.










