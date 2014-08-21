adf-table
=========

AngularJS DreamFactory table component

I'm going to give the basics.  I'm still working...in Beta.  Things may change without warning.  I also wrote this small
how-to in 30 mins so I might have not been 100% accurate.  Use at your own risk.



bower install dreamfactory-table or clone and link the js and css yourself.  It has to exist in 'bower_components/dreamfactory-table'.



### Including the module

```javascript

// Angular Module Definition

angular.module('YOUR_MAIN_APP_MODULE', ['dfTable'])

// We need to set a constant to keep track of your DSP_URL
// We'll use it through out the app.
.constant('DSP_URL', YOUR_DSP_URL)

// You'll also need to set your app key
// I set it like so.
.constant('DSP_API_KEY', YOUR_APP_NAME)
.config(['$httpProvider', 'DSP_API_KEY', function ($httpProvider, DSP_API_KEY) {

        // Set default headers for http requests
        $httpProvider.defaults.headers.common["X-DreamFactory-Application-Name"] = DSP_API_KEY;

    }])


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
        url: DSP_URL + '/rest/' + YOUR_DATA_SERVICE_HERE + '/' + YOUR_TABLE_HERE,
    };
```

Put this in your view/template for the route

```html

<df-table data-options="options"></df-table>

```


That should be it.  Now when you go to that route the table will load your data and paginate and build forms for editing
that table data.



###Slightly more advanced
Time to up the ante.  Lets add a few more options.  Let's assume you using the local db provided by DreamFactory and
you have a table called 'accounts'.  And that table has the fields 'first_name', 'last_name', and 'email'.  Let's set
default fields each to one of the three possible states.  If you don't set any default fields dfTable has a function
that will select some default fields for you.

```javascript
$scope.options = {

        // the service and table may seem redundant here but
        // we need these inside dfTable
        service: 'db',
        table: 'accounts',
        url: DSP_URL + '/rest/db/accounts',

        // we added a default fields object to our options object
        // each property of the default fields object the name of a table field
        // that we would like to specify the visiblity of
        defaultFields: {

            // setting a field to true shows it
            first_name: true,

            // setting a field to false hides it
            last_name: false,

            // setting a field to 'private' will prevent it from
            // being shown as well as hide it in the 'fields' tab
            // of the componenet
            email: 'private'

        }
    };
```


###More Advanced Usage
Let's get a bit crazier.  Is that a word...crazier?  Let's say in addition to our original defintion of the accounts table
we now have a few more generic fields.  We'll call them field_a, field_b, field_c, field_d and let's make everything
visible by default and then group and order them.

```javascript
$scope.options = {

        // the service and table may seem redundant here but
        // we need these inside dfTable
        service: 'db',
        table: 'accounts',
        url: DSP_URL + '/rest/db/accounts',

        // we added a default fields object to our options object
        // each property of the default fields object the name of a table field
        // that we would like to specify the visiblity of
        defaultFields: {

            // setting a field to true shows it
            first_name: true,
            last_name: true,
            email: true,
            field_a: true,
            field_b: true,
            field_c: true,
            field_d: true,
        },

        // Set the group fields property
        groupFields: {

            // order is determined by property number
            1: {
                    // This is the name of the group and will appear in
                    // the rendered template
                    name: 'Group A',

                    // The order of the fields in this array will
                    // determine the order the fields are rendered in
                    fields: ['first_name', 'last_name', 'email'],

                    // You can add a horizontal rule between the fields
                    dividers: false
            },
            2: {
                    name: 'Group B',
                    fields: ['field_a', 'field_b', 'field_c', 'field_d'],
                    dividers: true
            }
        }
    };
```


###Time to go Pro
We're going to keep building on the Account example.  Let's say we have an 'id' field that is auto increment.  The db
is going to assign it when the record is created.  We may want to see that in the record but we don't want to edit it,
and furthermore, we don't want that field to be visible when we create a record.  First, we'll determine it's visibility
for operations.  Then we'll override the field type to make sure it's not editable.


```javascript
$scope.options = {

        // the service and table may seem redundant here but
        // we need these inside dfTable
        service: 'db',
        table: 'accounts',
        url: DSP_URL + '/rest/db/accounts',

        // we added a default fields object to our options object
        // each property of the default fields object the name of a table field
        // that we would like to specify the visiblity of
        defaultFields: {

            // setting a field to true shows it
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            field_a: true,
            field_b: true,
            field_c: true,
            field_d: true,
        },

        // Set the group fields property
        groupFields: {

            // order is determined by property number
            1: {
                    // This is the name of the group and will appear in
                    // the rendered template
                    name: 'Group A',

                    // The order of the fields in this array will
                    // determine the order the fields are rendered in
                    fields: ['id', 'first_name', 'last_name', 'email'],

                    // You can add a horizontal rule between the fields
                    dividers: false
            },
            2: {
                    name: 'Group B',
                    fields: ['field_a', 'field_b', 'field_c', 'field_d'],
                    dividers: true
            }
        },

        // we add the excludeFields option
        excludeFields: [
            {
                // We set the name of the field we want to exclude
                name: 'id',

                // then set the visibility for the operations
                // You'll only possibly see the value during create and edit operations so
                // those are the only 'fields' or options available
                fields: {

                    // Setting 'create' to true excludes the field from a generated create form
                    create: true,

                    // Setting 'edit' to false allows the field to be shown in a generated edit form
                    edit: false
                }
            }
        ],

        // we add the overrideFields option
        overrideFields: [

            // This is an override fields object.
            {
                // We list the fields name we want to override
                field: 'id',

                // and we set editable to false making it...
                editable: false,
            }
        ]
    };
```

###Super User
Let's do a bit more with overrideFields.  Perhaps we have a field called 'contact' and it's type is 'int'. That int is
a contact's id field.  So we need to be able to choose from some contacts in order to assign this value.  This is how we
do that.



```javascript

$scope.contacts = [
    {
        id: 1,
        name: 'Jim',
        phone: 555-5555
    },
    {
        id: 2,
        name: 'Jane',
        phone: 555-5555
    }
]


$scope.options = {

        // the service and table may seem redundant here but
        // we need these inside dfTable
        service: 'db',
        table: 'accounts',
        url: DSP_URL + '/rest/db/accounts',

        // we added a default fields object to our options object
        // each property of the default fields object the name of a table field
        // that we would like to specify the visiblity of
        defaultFields: {

            // setting a field to true shows it
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            field_a: true,
            field_b: true,
            field_c: true,
            field_d: true,
            contact: true
        },

        // Set the group fields property
        groupFields: {

            // order is determined by property number
            1: {
                    // This is the name of the group and will appear in
                    // the rendered template
                    name: 'Group A',

                    // The order of the fields in this array will
                    // determine the order the fields are rendered in
                    fields: ['id', 'first_name', 'last_name', 'email', 'contact'],

                    // You can add a horizontal rule between the fields
                    dividers: false
            },
            2: {
                    name: 'Group B',
                    fields: ['field_a', 'field_b', 'field_c', 'field_d'],
                    dividers: true
            }
        },

        // we add the excludeFields option
        excludeFields: [
            {
                // We set the name of the field we want to exclude
                name: 'id',

                // then set the visibility for the operations
                // You'll only possibly see the value during create and edit operations so
                // those are the only 'fields' or options available
                fields: {

                    // Setting 'create' to true excludes the field from a generated create form
                    create: true,

                    // Setting 'edit' to false allows the field to be shown in a generated edit form
                    edit: false
                }
            }
        ],

        // we add the overrideFields option
        overrideFields: [

            // This is an override fields object.
            {
                // We list the fields name we want to override
                field: 'id',

                // and we set editable to false making it...
                // not editable
                editable: false,
            },

            {
                // name of field we want to override
                field: 'contact',

                // Additional data can be passed in and linked with this field
                record: $scope.contacts,

                // Let's make it editable
                editable: true,

                // This is how we are going to display this field
                display: {

                    // We want a select box
                    type: 'select',

                    // We need to tell the table what property
                    // to use for the option text the user will see
                    label: 'name',

                    // and what field from the object to use as the
                    // assigned value when it's chosen
                    value: 'id',
                }
            }
        ]
    };
```