'use strict';


// @TODO: Handle no defaultFields case and no records returned
// @TODO: Current export record doesn't dehighlight until clicked on once
// @TODO: Handle revert of related data


angular.module('dfTable', ['dfUtility'])
    .constant('DF_TABLE_ASSET_PATH', 'admin_components/dreamfactory-components/dreamfactory-table/')
    .run(['$templateCache', function ($templateCache) {

        $templateCache.put('df-input-text.html', '<input type="{{templateData.type}}"  class="form-control" placeholder="{{templateData.placeholder}}" data-ng-model="currentEditRecord[field.name]" data-ng-disabled="!templateData.editable">');
        $templateCache.put('df-input-binary.html', '<p>BINARY DATA</p>');
        $templateCache.put('df-input-datetime.html', '<p>DATETIME</p>');
        $templateCache.put('df-input-reference.html', '<df-table data-options="relatedOptions" data-parent-record="currentEditRecord" data-export-field="field"></df-table>');
        $templateCache.put('df-input-checkbox.html', '<input type="checkbox" data-ng-model="currentEditRecord[field.name]" data-ng-checked="currentEditRecord[field.name]">');
        $templateCache.put('df-input-select.html', '<select data-ng-model="currentEditRecord[field.name]" data-ng-options="obj[relatedData[templateData.prop].display.value] as obj[relatedData[templateData.prop].display.label] for obj in relatedData[templateData.prop].records"></select>');

    }])
    .directive('dfTable', ['DF_TABLE_ASSET_PATH', '$http', 'dfObjectService', function (DF_TABLE_ASSET_PATH, $http, dfObjectService) {

        return {
            restrict: 'E',
            scope: {
                options: '=',
                parentRecord: '=?',
                exportField: '=?'
            },
            templateUrl: DF_TABLE_ASSET_PATH + 'views/dreamfactory-table.html',
            link: function (scope, elem, attrs) {

                scope.defaults = {
                    normalizeData: false,
                    normalizeSchema: true,
                    autoClose: false,
                    params: {
                        filter: null,
                        limit: 10,
                        offset: 0,
                        fields: '*',
                        include_schema: true,
                        include_count: true
                    },
                    defaultFields: null,
                    relatedData: {},
                    extendFieldTypes: {},
                    exportValueOn: false
                };

                scope.options = dfObjectService.mergeObjects(scope.options, scope.defaults);

                scope.record = null;
                scope.schema = null;
                scope.relatedData = {};

                scope.tableFields = {};
                scope.defaultFieldsShown = {};

                scope.filter = {
                    viewBy: '',
                    prop: '',
                    value: null
                };

                scope.order = {
                    orderBy: '',
                    orderByReverse: false
                };

                scope.filteredRecords = false;
                scope.orderedRecords = false;

                scope.activeTab = null;
                scope.activeView = 'table';

                scope.pagesArr = [];
                scope.currentPage = {};

                scope.currentEditRecord = null;

                scope.extendFieldTypes = {};

                scope.inProgress = false;

                scope.count = 0;

                scope._exportValue = null;

                scope.newRecord = null;


                // PUBLIC API
                scope.setTab = function (tabStr) {

                    scope._setTab(tabStr);
                };

                scope.toggleSelected = function (dataObj) {

                    scope._toggleSelected(dataObj);
                };

                scope.getPrevious = function () {

                    if (scope._isFirstPage() || scope._isInProgress()) {
                        return false;
                    } else {
                        if (scope._checkForUnsavedRecords(scope.record)) {
                            scope._confirmAction('You have Unsaved records.  Continue without saving?', scope._getPrevious)
                        } else {
                            scope._getPrevious();
                        }
                    }
                };

                scope.getNext = function () {

                    if (scope._isLastPage() || scope._isInProgress()) {
                        return false;
                    } else {
                        if (scope._checkForUnsavedRecords(scope.record)) {
                            scope._confirmAction('You have Unsaved records.  Continue without saving?', scope._getNext)
                        } else {
                            scope._getNext();
                        }
                    }
                };

                scope.editRecord = function (dataObj) {

                    scope._editRecord(dataObj);
                };

                scope.createRecord = function() {

                    scope._createRecord();
                };

                scope.saveRecords = function () {

                    scope._saveRecords();
                };

                scope.revertRecords = function () {

                    scope._revertRecords();
                };

                scope.deleteRecords = function () {

                    if (scope._checkForUnsavedRecords(scope.record)) {
                        scope._confirmAction('You have Unsaved records.  Continue without saving?', scope._deleteRecords)
                    } else {
                        scope._deleteRecords();
                    }
                };

                scope.applyFilter = function () {

                    scope._applyFilter();
                };

                scope.removeFilter = function () {

                    scope._removeFilter();
                };

                scope.refreshResults = function () {

                    scope._refreshResults();
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setExportValue = function (dataObj) {

                    // Create Comple implementation
                    // right now we just call the private function
                    scope._setExportValue(dataObj);
                };

                scope.setExportValueToNull = function () {

                    scope._setExportValueToNull();
                };


                // PRIVATE API

                // Data States
                scope._addSelectedProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('selected')) {
                        dataObj.__dfUI['selected'] = false;
                    }
                };

                scope._addUnsavedProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('unsaved')) {
                        dataObj.__dfUI['unsaved'] = false;
                    }
                };

                scope._addExportProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('export')) {
                        dataObj.__dfUI['export'] = false;
                    }

                }

                scope._addStateProps = function (dataObj) {

                    if (!dataObj.hasOwnProperty['__dfUI']) {
                        dataObj['__dfUI'] = {};
                    }

                    scope._addSelectedProp(dataObj);
                    scope._addUnsavedProp(dataObj);
                    scope._addExportProp(dataObj);
                };

                scope._removeStateProps = function (dataObj) {
                    if (dataObj.hasOwnProperty['__dfUI']) {
                        delete dataObj.__dfUI;
                    }
                };

                scope._toggleSelectedState = function (dataObj) {

                    dataObj.__dfUI.selected = !dataObj.__dfUI.selected;
                };

                scope._toggleUnsavedState = function (dataObj) {

                    dataObj.__dfUI.unsaved = !dataObj.__dfUI.unsaved;
                };

                scope._setUnsavedState = function (dataObj, stateBool) {

                    dataObj.__dfUI.unsaved = stateBool;
                };

                scope._setExportState = function (dataObj, stateBool) {

                    dataObj.__dfUI.export = stateBool;
                }

                scope._isUnsaved = function (dataObj) {

                    return dataObj.__dfUI.unsaved;
                };

                scope._isSelected = function (dataObj) {

                    return dataObj.__dfUI.selected;
                };

                scope._isExport = function (dataObj) {

                    return dataObj.__dfUI.export;
                }

                scope._checkForUnsavedRecords = function (data) {


                    var unsavedRecords = false,
                        i = 0;

                    do {

                        if (i >= data.length) {
                            break;
                        }

                        if (data[i].__dfUI.unsaved) {
                            unsavedRecords = true;
                        }

                        i++

                    } while (unsavedRecords == false);

                    return unsavedRecords;
                };


                // Records and Data
                scope._getRecordsFromServer = function (requestDataObj) {

                    var params = {};

                    requestDataObj = requestDataObj || null;

                    if (requestDataObj) {
                        params = dfObjectService.mergeObjects(requestDataObj.params, scope.options.params);

                        console.log(params);
                    }else {
                        params = scope.options.params;
                    }

                    return $http({
                        method: 'GET',
                        url: scope.options.url,
                        params: params
                    });
                };

                scope._getRecordsFromData = function (dataObj) {

                    // create short var names
                    var limit = scope.options.params.limit,
                        records = [];

                    // hacky way to check for where our records are
                    // were they passed in from the result of a promise,
                    // or is it actually a promise that needs to be parsed
                    if (dataObj.hasOwnProperty('record')) {
                        records = dataObj.record;
                    } else if (dataObj.hasOwnProperty('data')) {

                        if (dataObj.data.hasOwnProperty('record')) {
                            records = dataObj.data.record
                        } else {
                            records = dataObj.data.data.record
                        }
                    }


                    // if the records passed in are more than the limit slice off excess
                    // records else return records.  This usually happens if preload limit
                    // not set to match table limit.
                    return records.length > limit ? records.slice(0, limit) : records;
                };

                scope._getMetaFromData = function (dataObj) {

                    var meta = {};

                    // hacky way to check for where our records are
                    // were they passed in from the result of a promise,
                    // or is it actually a promise that needs to be parsed
                    if (dataObj.hasOwnProperty('meta')) {
                        meta = dataObj.meta;
                    } else if (dataObj.hasOwnProperty('data')) {

                        if (dataObj.data.hasOwnProperty('meta')) {
                            meta = dataObj.data.meta
                        } else {
                            meta = dataObj.data.data.meta
                        }
                    }

                    return meta;
                };

                scope._getSchemaFromData = function (dataObj) {

                    return scope._getMetaFromData(dataObj).schema
                };

                scope._getCountFromMeta = function (dataObj) {

                    var count = scope._getMetaFromData(dataObj).count;

                    scope._setCount(count);

                    return count;
                };

                scope._setCount = function (countInt) {
                    scope.count = countInt;
                };

                scope._getOptionFromParams = function (keyStr) {

                    return scope.options.params[keyStr];
                };

                scope._setOptionFromParams = function (keyStr, valueStr) {


                }

                scope._buildField = function (fieldNameStr) {

                    console.log(fieldNameStr);
                };

                scope._createRevertCopy = function (dataObj) {

                    var temp = angular.copy(dataObj);

                    dataObj['__dfData'] = {};
                    dataObj.__dfData['revert'] = temp;
                };

                scope._getRevertCopy = function (dataObj) {

                    return dataObj.__dfData.revert;
                };

                scope._hasRevertCopy = function (dataObj) {

                    if (dataObj.hasOwnProperty('__dfData')) {
                        if (dataObj.__dfData.hasOwnProperty('revert')) {
                            return true
                        } else {
                            return false
                        }
                    } else {
                        return false
                    }
                };

                scope._removeRevertCopy = function (dataObj) {

                    if (dataObj.__dfData.revert) {
                        delete dataObj.__dfData.revert;
                    }
                };

                scope._removeAllDFData = function (dataObj) {

                    if (dataObj.__dfData) {
                        delete dataObj.__dfData;
                    }
                };

                scope._removeAllUIData = function (dataObj) {

                    delete dataObj.__dfUI;
                };

                scope._compareObjects = function (dataObj1, dataObj2) {

                    for (var key in dataObj1) {

                        if (key === 'dfUISelected' || key === 'dfUIUnsaved' || key === '__dfUI' || key == '__dfData' || key === '$$hashKey') continue;

                        if (dataObj1[key] !== dataObj2[key]) {
                            if ((dataObj1[key] == null || dataObj1[key] == '') && (dataObj2[key] == null || dataObj2[key] == '')) {
                                return false;
                            }
                            return true;
                        }
                    }

                    return false;
                };

                scope._getRecordsWithState = function (recordsDataArr, stateStr, removeDFDataBool, removeUIDataBool) {

                    var records = [];

                    removeDFDataBool = typeof removeDFDataBool !== 'undefined' ? removeDFDataBool : false;
                    removeUIDataBool = typeof removeUIDataBool !== 'undefined' ? removeUIDataBool : false;


                    angular.forEach(recordsDataArr, function (_obj) {

                        if (_obj.__dfUI[stateStr]) {

                            if (removeDFDataBool) {
                                scope._removeAllDFData(_obj);
                            }

                            if (removeUIDataBool) {
                                scope._removeAllUIData(_obj);
                            }

                            records.push(_obj);
                        }
                    });

                    return records;
                };

                scope._saveRecordsToServer = function (recordsDataArr) {

                    if (recordsDataArr.length == 0) {
                        throw {
                            module: 'DreamFactory Access Management Module',
                            type: 'warning',
                            provider: 'dreamfactory',
                            exception: {
                                error: [
                                    {
                                        message: 'No records selected for save.'
                                    }
                                ]
                            }
                        }
                    }

                    var requestDataObj = {
                        record: recordsDataArr
                    };

                    return $http(
                        {
                            method: 'PATCH',
                            url: scope.options.url,
                            data: requestDataObj
                        });

                };

                scope._deleteRecordsFromServer = function (recordsDataArr) {


                    if (recordsDataArr.length == 0) {
                        throw {
                            module: 'DreamFactory Access Management Module',
                            type: 'warning',
                            provider: 'dreamfactory',
                            exception: {
                                error: [
                                    {
                                        message: 'No records selected for delete.'
                                    }
                                ]
                            }
                        }
                    }

                    var requestDataObj = {
                        record: recordsDataArr
                    };

                    return $http({
                        method: 'DELETE',
                        url: scope.options.url,
                        data: requestDataObj
                    })

                };

                scope._isInProgress = function () {

                    return scope.inProgress;
                };

                scope._setInProgress = function (stateBool) {

                    scope.inProgress = stateBool;
                };

                scope._createNewRecordObj = function () {

                    var newRecord = {};

                    for (var _key in scope.schema) {
                        newRecord[_key.name] = ''
                    }

                    return newRecord;
                };



                // View Control
                scope._setCurrentEditRecord = function (dataObj) {

                    scope.currentEditRecord = dataObj;
                };

                scope._setNewRecordObj = function() {

                    scope.newRecord = scope._createNewRecordObj();
                };

                scope._confirmAction = function (_message, _action) {

                    if (confirm(_message)) {
                        _action.call();
                    }
                };


                // Table
                scope._getDefaultFields = function (dataObj) {

                    return dataObj.defaultFields;
                };

                scope._removePrivateFields = function (dataObj) {

                    if (!dataObj) return;

                    angular.forEach(scope.record, function (_obj) {

                        for (var _key in _obj) {
                            if (dataObj[_key] && dataObj[_key] == 'private') {
                                delete _obj[_key]
                            }
                        }
                    })
                };

                scope._setElementActive = function (tabStr) {

                    scope.activeTab = tabStr;
                };

                scope._createFieldsObj = function (schemaDataObj) {

                    angular.forEach(schemaDataObj, function (value, index) {
                        if (scope.defaultFieldsShown.hasOwnProperty(value.name)) {
                            switch (scope.defaultFieldsShown[value.name]) {

                                case true:
                                    scope.tableFields[value.name] = {active: true, name: value.name, label: value.label};
                                    break;

                                case false:
                                    scope.tableFields[value.name] = {active: false, name: value.name, label: value.label};
                                    break;

                                case 'private':
                                    break;

                                default:
                                    scope.tableFields[value.name] = {active: false, name: value.name, label: value.label};
                            }
                        } else {

                            scope.tableFields[value.name] = {active: false, name: value.name, label: value.label};
                        }
                    });
                };

                scope._init = function (newValue) {

                    scope._prepareRecords(newValue);

                    scope._prepareRelatedData(newValue);

                    scope._prepareSchema(newValue);

                    scope._prepareExtendedFieldTypes(newValue);

                    scope.defaultFieldsShown = scope._getDefaultFields(newValue);

                    scope._createFieldsObj(scope.schema.field);

                    scope.activeTab = scope.schema.name + "-table";

                    scope._calcPagination(newValue);

                    scope._setCurrentPage(scope.pagesArr[0]);

                };

                scope._prepareRecords = function (data) {

                    scope.record = scope._getRecordsFromData(data);

                    scope._removePrivateFields(scope._getDefaultFields(scope.options));

                    angular.forEach(scope.record, function (_obj) {

                        scope._addStateProps(_obj);

                        if (scope.options.exportValueOn && scope._exportValue) {
                            if(scope._checkExportValue(_obj)) {
                                scope._setExportState(_obj, true);
                            }
                        }
                    });


                    if (scope.options.normalizeData) {
                        scope.record = scope._normalizeData(scope.record);
                    }

                };

                scope._checkExportValue = function(dataObj) {

                    return dataObj[scope.exportField.ref_fields] === scope._exportValue[scope.exportField.ref_fields];
                };

                scope._prepareSchema = function (data) {

                    scope.schema = scope._getSchemaFromData(data);

                    if (data.normalizeSchema) {
                        scope.schema = scope._normalizeSchema(scope.schema, scope.record);
                    }
                };

                scope._prepareRelatedData = function (data) {

                    if (data.relatedData == null) return false;

                    angular.forEach(data.relatedData, function (_obj) {
                        scope.relatedData[_obj.field] = {};
                        scope.relatedData[_obj.field]['records'] = scope._getRecordsFromData(_obj.record);
                        scope.relatedData[_obj.field]['display'] = _obj.display;
                    });
                };

                scope._prepareExtendedFieldTypes = function (data) {

                    if (data.extendFieldTypes == null) return false;

                    angular.forEach(data.extendFieldTypes, function (_obj) {
                        scope.extendFieldTypes[_obj.db_type] = {};

                        for (var _key in _obj) {
                            scope.extendFieldTypes[_obj.db_type][_key] = _obj[_key];
                        }
                    });
                };

                scope._setActiveView = function (viewStr) {

                    scope.activeView = viewStr;
                };

                scope._setExportValue = function (dataObj) {

                    scope._exportValue = dataObj;
                };


                // Pagination
                scope._calcTotalPages = function (totalCount, numPerPage) {

                    return Math.ceil(totalCount / numPerPage);
                };

                scope._createPageObj = function (_pageNum) {

                    return {
                        number: _pageNum + 1,
                        value: _pageNum,
                        offset: _pageNum * scope._getOptionFromParams('limit'),
                        stopPropagation: false
                    }
                };

                scope._createPagesArr = function (_totalCount) {

                    scope.pagesArr = [];

                    for (var i = 0; i < _totalCount; i++) {

                        scope.pagesArr.push(scope._createPageObj(i));
                    }
                };

                scope._setCurrentPage = function (pageDataObj) {

                    scope.currentPage = pageDataObj;
                };

                scope._getCurrentPage = function () {

                    return scope.currentPage;
                }

                scope._isFirstPage = function () {

                    return scope.currentPage.value === 0;
                };

                scope._isLastPage = function () {

                    return scope.currentPage.value === scope.pagesArr.length - 1
                };

                scope._previousPage = function () {

                    scope.currentPage = scope.pagesArr[scope.currentPage.value - 1]
                };

                scope._nextPage = function () {

                    scope.currentPage = scope.pagesArr[scope.currentPage.value + 1]
                };

                scope._calcPagination = function (newValue) {

                    scope._createPagesArr(scope._calcTotalPages(scope._getCountFromMeta(newValue), scope._getOptionFromParams('limit')));
                };


                // Filtering
                scope._resetFilter = function (schemaDataObj) {

                    scope.filter = {
                        viewBy: schemaDataObj.field[0].name || '',
                        prop: schemaDataObj.field[0].name || '',
                        value: null
                    };
                };

                scope._isFiltered = function () {

                    return scope.filteredRecords;
                };

                scope._createFilterParams = function () {

                    return scope.filter.prop + ' like "%' + scope.filter.value + '%"';
                };

                scope._unsetFilterInOptions = function () {

                    if (scope.options.params.hasOwnProperty('filter')) {
                        delete scope.options.params.filter;
                    }
                };

                scope._setFilterInOptions = function () {

                    if (!scope._checkForFilterValue()) return false;

                    if (!scope.options.params.hasOwnProperty('filter')) {
                        scope.options.params['filter'] = scope._createFilterParams();
                        return true;
                    } else {
                        scope.options.params.filter = scope._createFilterParams();
                        return true;
                    }

                };

                scope._checkForFilterValue = function () {

                    return !!scope.filter.value;
                };


                // Ordering
                scope._resetOrder = function (schemaDataObj) {

                    scope.order = {
                        orderBy: schemaDataObj.field[0].name || '',
                        orderByReverse: false
                    }
                };

                scope._isOrdered = function () {
                    return scope.orderedRecords;
                }

                scope._createOrderParams = function () {

                    var orderStr = scope.order.orderBy + ' ';
                    orderStr += scope.order.orderByReverse ? 'DESC' : 'ASC';

                    return orderStr;
                };

                scope._unsetOrderInOptions = function () {

                    if (scope.options.params.hasOwnProperty('order')) {
                        delete scope.options.params.order;
                    }
                };

                scope._setOrderInOptions = function () {

                    if (!scope.options.params.hasOwnProperty('order')) {
                        scope.options.params['order'] = scope._createOrderParams();
                    } else {
                        scope.options.params.order = scope._createOrderParams();
                    }
                };


                // COMPLEX IMPLEMENTATION
                scope._setTab = function (tabStr) {

                    scope._setElementActive(tabStr);
                };

                scope._toggleSelected = function (dataObj) {

                    scope._toggleSelectedState(dataObj);
                };

                scope._normalizeData = function (dataObj) {

                    angular.forEach(dataObj, function (_obj) {

                        for (var _key in _obj) {
                            if (_obj[_key] == null) {
                                _obj[_key] = 'NULL'
                            }
                        }
                    });

                    return dataObj;
                };

                scope._normalizeSchema = function (schemaDataObj, recordsDataArr) {

                    var normalizedSchema = [];

                    // Delete schema fields that don't represent values in the model
                    for (var _key in schemaDataObj.field) {
                        if (recordsDataArr[0].hasOwnProperty(schemaDataObj.field[_key].name)) {


                            normalizedSchema.push(schemaDataObj.field[_key]);
                        }
                    }

                    delete schemaDataObj.field;

                    schemaDataObj['field'] = normalizedSchema;


                    return schemaDataObj;
                };

                scope._getPrevious = function () {

                    scope._previousPage();
                };

                scope._getNext = function () {

                    scope._nextPage();
                };

                scope._editRecord = function (dataObj) {

                    scope._setCurrentEditRecord(dataObj);

                };

                scope._saveRecords = function () {

                    scope._setInProgress(true);

                    var recordsToSave = scope._getRecordsWithState(scope.record, 'unsaved', true);

                    scope._saveRecordsToServer(recordsToSave).then(
                        function (result) {

                            angular.forEach(scope.record, function (_obj) {

                                if (scope._isUnsaved(_obj)) {
                                    scope._toggleUnsavedState(_obj);
                                }

                                if (scope._isSelected(_obj)) {
                                    scope._toggleSelectedState(_obj);
                                }

                                if (scope._hasRevertCopy(_obj)) {
                                    scope._removeRevertCopy(_obj);
                                }
                            });

                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
                };

                scope._revertRecords = function () {

                    angular.forEach(scope.record, function (_obj, _index) {
                        if (scope._isUnsaved(_obj)) {
                            scope.record[_index] = scope._getRevertCopy(_obj);
                        }
                    })
                };

                scope._deleteRecords = function () {

                    var recordsToDelete = scope._getRecordsWithState(scope.record, 'selected');

                    scope._deleteRecordsFromServer(recordsToDelete).then(
                        function (result) {

                            var requestDataObj = {},
                                curPage = scope._getCurrentPage().value,
                                curOffset = scope._getCurrentPage().offset;


                            // Are we on the last page
                            if (scope._isLastPage() && (scope.record.length === scope._getRecordsFromData(result).length)) {

                                // we are so reduce the offset of records by the limit amount
                                curOffset = curOffset - scope._getOptionFromParams('limit');
                            }

                            // Merge our requeset params with our new offset so we
                            // have all the params for the call
                            requestDataObj['params'] = dfObjectService.mergeObjects({
                                    offset: curOffset
                                },
                                scope.options.params);


                            // Get some records from the server with our request obj
                            scope._getRecordsFromServer(requestDataObj).then(
                                function (_result) {

                                    // Set em up
                                    scope._prepareRecords(_result);

                                    // Init new pagination
                                    scope._createPagesArr(scope._calcTotalPages(scope._getCountFromMeta(_result), scope._getOptionFromParams('limit')));

                                    // if the page value before the deletion was greater than the
                                    // new pages array and it doesn't equal zero decrement by one
                                    if (curPage > scope.pagesArr.length - 1 && curPage !== 0) {
                                        curPage = curPage - 1;
                                        scope.pagesArr[curPage].stopPropagation = true;
                                    }

                                    // Set current page
                                    scope._setCurrentPage(scope.pagesArr[curPage]);

                                },
                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Table Module',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            );

                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
                };

                scope._getRecordsWithFilter = function () {

                    var requestDataObj = {};

                    requestDataObj['params'] = dfObjectService.mergeObjects({
                        filter: scope._createFilterParams()
                    }, scope.options.params);


                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._init(dfObjectService.mergeObjects({data: result}, scope.options));
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });

                };

                scope._refreshResults = function () {

                    if (scope._checkForUnsavedRecords(scope.record)) {
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {
                            return false;
                        }
                    }

                    var requestDataObj = {};

                    requestDataObj['params'] = {offset: 0};

                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                            scope._calcPagination(result);
                            scope._setCurrentPage(scope.pagesArr[0])
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
                };

                scope._applyFilter = function () {

                    // Do we have unsaved records before change the page
                    if (scope._checkForUnsavedRecords(scope.record)) {

                        // Continue?
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {
                            // End this function
                            return false;
                        }
                    }


                    // If we have a filter set filtered records true
                    if (scope._setFilterInOptions()) scope.filteredRecords = true;

                    // we have applied a custom order set ordered records true
                    scope._setOrderInOptions();
                    scope.orderedRecords = true;


                    var requestDataObj = {};

                    // set our offset to the new page offset
                    requestDataObj['params'] = {offset: 0};

                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                            scope._calcPagination(result);
                            scope._setCurrentPage(scope.pagesArr[0])
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });

                };

                scope._removeFilter = function () {

                    // Do we have unsaved records before change the page
                    if (scope._checkForUnsavedRecords(scope.record)) {

                        // Continue?
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {
                            // End this function
                            return false;
                        }
                    }


                    scope._unsetFilterInOptions();
                    scope._unsetOrderInOptions();
                    scope._resetFilter(scope.schema);
                    scope._resetOrder(scope.schema);
                    scope.filteredRecords = false;
                    scope.orderedRecords = false;

                    var requestDataObj = {};

                    // set our offset to the new page offset
                    requestDataObj['params'] = {offset: 0};

                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                            scope._calcPagination(result);
                            scope._setCurrentPage(scope.pagesArr[0])
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
                };

                scope._orderOnSelect = function (fieldObj) {

                    var orderedBy = scope.order.orderBy;

                    if (orderedBy === fieldObj.name) {
                        scope.order.orderByReverse = !scope.order.orderByReverse;
                    } else {
                        scope.order.orderBy = fieldObj.name;
                        scope.order.orderByReverse = false;
                    }
                };

                scope._createRecord = function() {

                    scope._setNewRecordObj();
                };

                scope._setExportValueToNull = function () {

                    scope.setExportValue(null)
                };


                // WATCHERS / INIT

                var watchOptions = scope.$watch('options', function (newValue, oldValue) {

                    if (!newValue) return false;


                        if (scope.options.exportValueOn && !scope._exportValue && scope.parentRecord[scope.exportField.name]) {

                            var requestDataObj = {};

                            requestDataObj['params'] = {filter: scope.exportField.ref_fields + ' = ' + scope.parentRecord[scope.exportField.name]};

                            scope._getRecordsFromServer(requestDataObj).then(
                                function(result) {

                                    var record = scope._getRecordsFromData(result)[0]
                                    scope._addStateProps(record);
                                    scope._exportValue = record;

                                    if (scope.options.params.filter) {
                                        delete scope.options.params.filter;
                                    }

                                },
                                function(reject) {

                                    throw {
                                        module: 'DreamFactory Table Module',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            )
                        }



                    if (!newValue.data) {

                        scope._getRecordsFromServer().then(
                            function (_result) {

                                newValue['data'] = _result;
                                scope._init(newValue);
                                scope._resetFilter(scope.schema);
                                scope._resetOrder(scope.schema);

                            },
                            function (_reject) {
                                throw {
                                    module: 'DreamFactory Table Module',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: _reject
                                }
                            }
                        )
                    }
                    else {

                        scope._init(newValue);
                        scope._resetFilter(scope.schema);
                        scope._resetOrder(scope.schema);
                    }



                });

                var watchCurrentPage = scope.$watch('currentPage', function (newValue, oldValue) {


                    // Check if page actually changed
                    if (newValue.value == oldValue.value) return false;

                    // Stop watcher.  We don't want to call for new data.
                    // we already got it from a previous function.
                    // this happens when we delete all the items from a page
                    // A successful delete sets up all the data and sets the current page
                    // so no need to continue with this function.  But this is a one time
                    // thing for this page so we reset the stop propagation back to its
                    // default of false.
                    if (newValue.stopPropagation) {
                        newValue.stopPropagation = false;
                        return false;
                    }

                    // Do we have unsaved records before change the page
                    if (scope._checkForUnsavedRecords(scope.record)) {

                        // Continue?
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {

                            // No.  Set old page stopPropagation value
                            // to avoid loop when the watcher detects the currentPage
                            // value change
                            oldValue.stopPropagation = true;

                            // set old page
                            scope._setCurrentPage(oldValue);

                            // End this function
                            return false;
                        }
                    }

                    // Make a request object
                    var requestDataObj = {};

                    requestDataObj['params'] = {offset: newValue.offset};


                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });

                });

                var watchCurrentEditRecord = scope.$watch('currentEditRecord', function (newValue, oldValue) {

                    if (newValue) {

                        if (!scope._hasRevertCopy(newValue)) {
                            scope._createRevertCopy(newValue);
                        }
                        scope._setActiveView('edit');
                    } else {

                        scope._setActiveView('table');
                    }
                });

                var watchCurrentEditRecordState = scope.$watchCollection('currentEditRecord', function (newValue, oldValue) {

                    if (newValue) {
                        if (scope._compareObjects(newValue, newValue.__dfData.revert)) {
                            scope._setUnsavedState(newValue, true);
                        } else {
                            scope._setUnsavedState(newValue, false);
                        }
                    }
                });

                var watchParentRecord = scope.$watchCollection('parentRecord', function (newValue, oldValue) {

                    if (!newValue) return false;

                });

                var watchExportValue = scope.$watch('_exportValue', function (newValue, oldValue) {

                    if (!newValue && !oldValue) return false;

                    console.log(scope.exportField.name + ' ' + scope.parentRecord[scope.exportField.name] + ' = '
                        + scope.exportField.ref_fields + ' ' + newValue[scope.exportField.ref_fields])

                    if (scope.parentRecord[scope.exportField.name] === newValue[scope.exportField.ref_fields]) return false;

                    if (!newValue) {
                        scope._setExportState(oldValue, false);
                        return false;
                    }

                    // Set state props
                    if (oldValue) {
                        scope._setExportState(oldValue, false);
                    }
                    scope._setExportState(newValue, true);


                    // Assign proper value from obj to ref field on parent
                    scope.parentRecord[scope.exportField.name] = newValue[scope.exportField.ref_fields];

                });

                var watchNewRecord = scope.$watch('newRecord', function (newValue, oldValue) {

                    if (newValue) {
                        scope._setActiveView('new');
                    } else {
                        scope._setActiveView('table');
                    }
                });

                // MESSAGES


            }
        }
    }])
    .directive('editRecord', ['DF_TABLE_ASSET_PATH', '$http', 'dfObjectService', function (DF_TABLE_ASSET_PATH, $http, dfObjectService) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: DF_TABLE_ASSET_PATH + 'views/edit-record.html',
            link: function (scope, elem, attrs) {


                // PUBLIC API
                scope.closeRecord = function () {

                    scope._closeEdit();
                };

                scope.revertRecord = function () {

                    scope._revertRecord();
                };

                scope.deleteRecord = function () {

                    scope._deleteRecord();
                };

                scope.saveRecord = function () {

                    scope._saveRecord();
                };


                // PRIVATE API
                scope._closeEdit = function () {

                    scope.currentEditRecord = null;
                };

                scope._revertRecordData = function () {

                    var recordCopy = scope._getRevertCopy(scope.currentEditRecord);
                    for (var _key in recordCopy) {
                        if (scope.currentEditRecord.hasOwnProperty(_key)) {
                            scope.currentEditRecord[_key] = recordCopy[_key];
                        }
                    }
                };

                scope._deleteRecordFromServer = function (recordDataObj) {

                    return $http({
                        method: 'DELETE',
                        url: scope.options.url,
                        data: recordDataObj
                    })
                };

                scope._saveRecordToServer = function (recordDataObj) {

                    return $http({
                        method: 'PATCH',
                        url: scope.options.url,
                        data: recordDataObj
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._revertRecord = function () {
                    scope._revertRecordData();
                };

                scope._deleteRecord = function () {

                    scope._setInProgress(true);

                    scope._deleteRecordFromServer(scope.currentEditRecord).then(
                        function (result) {

                            var requestDataObj = {},
                                curPage = scope._getCurrentPage().value,
                                curOffset = scope._getCurrentPage().offset;


                            // Are we on the last page?
                            if (scope._isLastPage()) {

                                // did we successfully delete the same number of records
                                // as there were left to display?

                                if (typeof result === 'object' && scope.record.length === 1) {

                                    // reduce the offset of records by the limit amount
                                    // because we have one less page
                                    curOffset = curOffset - scope._getOptionFromParams('limit');
                                }
                            }

                            // Merge our requeset params with our new offset so we
                            // have all the params for the call
                            requestDataObj['params'] = dfObjectService.mergeObjects({
                                    offset: curOffset
                                },
                                scope.options.params);


                            // Get some records from the server with our request obj
                            scope._getRecordsFromServer(requestDataObj).then(
                                function (_result) {

                                    // Set em up
                                    scope._prepareRecords(_result);

                                    // Init new pagination
                                    scope._createPagesArr(scope._calcTotalPages(scope._getCountFromMeta(_result), scope._getOptionFromParams('limit')));

                                    // if the page value before the deletion was greater that the
                                    // new pages array and it doesn't equal zero decrement by one
                                    if ((curPage > scope.pagesArr.length - 1) && (curPage !== 0)) {
                                        curPage = curPage - 1
                                        scope.pagesArr[curPage].stopPropagation = true;
                                    }

                                    // Set current page
                                    scope._setCurrentPage(scope.pagesArr[curPage]);
                                    scope._setCurrentEditRecord(null);
                                },
                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Table Module',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            );

                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }

                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false);
                        },
                        function () {
                            scope._setInProgress(false);
                        })

                };

                scope._saveRecord = function () {

                    scope._setInProgress(true);
                    scope._saveRecordToServer(scope.currentEditRecord).then(
                        function (result) {

                            scope._removeRevertCopy(scope.currentEditRecord);
                            scope._setUnsavedState(scope.currentEditRecord, false);

                            if (scope.options.autoClose) {
                                scope._closeEdit();
                            } else {
                                scope._createRevertCopy(scope.currentEditRecord);
                            }
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false);
                        },
                        function () {
                            scope._setInProgress(false);
                        }
                    )
                };


                // MESSAGES


            }
        }


    }])
    .directive('createRecord', ['DF_TABLE_ASSET_PATH', '$http', function(DF_TABLE_ASSET_PATH, $http) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: DF_TABLE_ASSET_PATH + 'views/create-record.html',
            link: function (scope, elem, attrs) {


                // PUBLIC API
                scope.closeCreateRecord = function () {
                    scope._closeCreateRecord()
                };

                scope.saveNewRecord = function () {

                    scope._saveNewRecord();
                };


                // PRIVATE API
                scope._setCreateNewRecordNull = function () {

                    scope.newRecord = null;
                };

                scope._saveNewRecordToServer = function () {

                    return $http({
                        method: 'POST',
                        url: scope.options.url,
                        data: scope.newRecord
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._closeCreateRecord = function() {

                    scope._setCreateNewRecordNull();
                };

                scope._saveNewRecord = function () {

                    scope._setInProgress(true);
                    scope._saveNewRecordToServer().then(
                        function(result) {

                            console.log(result);
                            scope._closeCreateRecord();
                        },
                        function(reject) {

                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false);
                        },
                        function () {
                            scope._setInProgress(false);
                        }
                    )
                };



                // MESSAGES




            }
        }
    }])
    .directive('dreamfactoryBuildField', ['$templateCache', '$compile', 'dfObjectService', 'DSP_URL', function ($templateCache, $compile, dfObjectService, DSP_URL) {

        return {
            restrict: 'A',
            scope: {
                field: '=field',
                service: '=service',
                extendFieldTypes: '=extendFieldType',
                relatedData: '=relatedData',
                currentEditRecord: '=?currentEditRecord'
            },
            link: function (scope, elem, attrs) {


                scope.defaultFieldTypes = {
                    id: {
                        template: 'df-input-text.html',
                        placeholder: 'Id',
                        type: 'text',
                        editable: false
                    },
                    string: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter String Value',
                        type: 'text',
                        editable: true
                    },
                    integer: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Integer Value',
                        type: 'number',
                        editable: true
                    },
                    boolean: {
                        template: 'df-input-checkbox.html',
                        placeholder: '',
                        type: '',
                        editable: true
                    },
                    binary: {
                        template: 'df-input-binary.html',
                        placeholder: 'Enter String Value',
                        type: 'text',
                        editable: false
                    },
                    float: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Float Value',
                        type: 'number',
                        editable: true
                    },
                    decimal: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Decimal Value',
                        type: 'number',
                        editable: true
                    },
                    datetime: {
                        template: 'df-input-datetime.html',
                        placeholder: '',
                        type: '',
                        editable: false
                    },
                    date: {
                        template: 'df-input-datetime.html',
                        placeholder: '',
                        type: '',
                        editable: false
                    },
                    time: {
                        template: 'df-input-datetime.html',
                        placeholder: '',
                        type: '',
                        editable: false
                    },
                    reference: {
                        template: 'df-input-reference.html',
                        placeholder: '',
                        type: '',
                        editable: false
                    },
                    user_id: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    user_id_on_update: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    user_id_on_create: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    timestamp_on_update: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    }
                };

                scope.fieldTypes = dfObjectService.mergeObjects(scope.extendFieldTypes, scope.defaultFieldTypes);


                if (scope.relatedData[scope.field.name]) {

                    scope.templateData = {
                        prop: scope.field.name,
                        template: '',
                        placeholder: scope.relatedData[scope.field.name].display.type || '',
                        type: scope.relatedData[scope.field.name].display.type || 'text',
                        editable: scope.relatedData[scope.field.name].editable,
                        field: scope.field || ''
                    };

                    var type = scope.relatedData[scope.field.name].display.type;

                    switch (type) {

                        case 'select':
                            scope.templateData.template = 'df-input-select.html';
                            break;

                        case 'checkbox':
                            scope.templateData.template = 'df-input-checkbox.html';
                            break;

                        case 'text':
                            scope.templateData.template = 'df-input-text.html';
                            break;

                        case 'textarea':
                            scope.templateData.template = 'df-input-text.html';
                            break;

                        case 'custom':
                            scope.templateData.template = scope.relatedData[scope.field.name].display.template;
                            break;

                        default:
                            scope.templateData.template = 'df-input-text.html'

                    }

                } else {
                    scope.templateData = scope.fieldTypes[scope.field.type];
                }

                // Data for related tables
                if (scope.field.type === 'reference') {

                    var systemTablePrefix = 'df_sys_';


                    scope._parseSystemTableName = function (tableNameStr) {

                        var tableName = tableNameStr.substr(0, systemTablePrefix.length);

                        if (tableName === systemTablePrefix) {
                            return tableNameStr.substr(systemTablePrefix.length);
                        }
                        else {
                            return tableNameStr;
                        }
                    };

                    scope._buildURL = function (serviceNameStr, tableNameStr) {

                        return DSP_URL + '/rest/' + serviceNameStr + '/' + tableNameStr
                    };

                    scope.relatedOptions = {
                        service: scope.service,
                        table: scope._parseSystemTableName(scope.field.ref_table),
                        url: scope._buildURL(scope.service, scope._parseSystemTableName(scope.field.ref_table)),
                        params: {
                            filter: null,
                            limit: 2,
                            offset: 0,
                            fields: '*',
                            include_schema: true,
                            include_count: true
                        },
                        defaultFields: {},
                        exportValueOn: true
                    };

                    scope.relatedOptions.defaultFields[scope.field.ref_fields] = true;
                }

                elem.append($compile($templateCache.get(scope.templateData.template))(scope));

            }
        }
    }]);
