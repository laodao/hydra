/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
		"app",
		"modules/datatable",
	    "modules/util",		
       	"text!../../templates/alerts.filter.html",
       	"text!../../templates/alerts.selectable.html",
       	"text!../../templates/alerts.detail.html",       	
       	"backbone"
],
function(
		 app,
		 DataTable,
		 util,		 
		 alertFilterTemplate, 
		 alertSelectableTemplate,
		 alertDetailTemplate,
		 Backbone
		 ){
    	var Model = Backbone.Model.extend({
    		idAttribute:"alertId",
        	url:function(){return "/alert/get?alertId=" + this.alertId;},
        	defaults:{ 
        		jobIds:"",
        		type:-1,
        		timeout:-1,
        		email:""},
        	save:function(){
        		var postData = {
        			lastAlertTime:this.get("lastAlertTime"),
        			type:$("#alertType").val(),
        			timeout:this.get("timeout"),
        			email:this.get("email"),
        			jobIds:this.get("jobIds")
        		};
        		if (!this.isNew()) {
        			postData.alertId= this.get("alertId");
        		}
        		return $.ajax({
        			url: "/alert/save",
        			type: "POST",
        			data: postData,
        			dataType: "json"
        		});
        	},
        	delete:function(){
        		var alertId = this.get("alertId");
        		return $.ajax({
        			url: "/alert/delete",
        			type: "POST",
        			data: {alertId:alertId},
        			dataType: "text"
        		});
        	},
        	parse:function(data) {
        		return data;
        	}
    	});
    	var Collection = Backbone.Collection.extend({
        	parse:function(collection){
            	var array = new Array(collection.length);
            	_.each(collection,function(model,idx){
               		array[idx]= Model.prototype.parse(model);
            	});
            	return array;
        	},
        	model:Model
    	});
    	var TableView = DataTable.View.extend({
    		initialize:function(options){
        		_.bindAll(this,'handleDeleteButtonClick');
        		options = options || {};
        		this.id = options.id || "alertTable";
        		this.$el.attr("id",this.id);
        		var self=this;
        		var columns = [{
            		"sTitle":"",
            		"sClass":"alert-cb",
            		"sWidth":"5%",
            		"mData": "alertId",
            		"bSearchable":false,
            		"bSortable":false,
            		"mRender":function(val,type,data){
                		if(self.selectedIds[val]){
                    		return "<input checked class='row_selectable' type='checkbox'></input>";
                		}else{
                    		return "<input class='row_selectable' type='checkbox'></input>";
                		}
            		}
        		},
        		{
        			"sTitle":"Alert ID",
            		"mData": "alertId",
            		"sWidth": "18%",
            		"bVisible":true,
            		"bSearchable":true,
            		"mRender":function(val,type,data){
                		return "<a href='#alerts/"+encodeURIComponent(val)+"'>"+val+"</a>";
            		}
        		},        
        		{
        			"sTitle":"Job IDs",
            		"mData": "jobIds",
            		"sWidth": "22%",
            		"bVisible":true,
            		"bSearchable":true,            
        		},
        		{
        			"sTitle":"Type",
            		"mData": "type",
            		"sWidth": "12%",
            		"bVisible":true,
            		"bSearchable":true,
            		"mRender": function(val,type,data) {
            			return util.alertTypes[val] ? util.alertTypes[val] : "Unknown Alert Type";            			
            		}
        		},
        		{
        			"sTitle":"Timeout",
            		"mData": "timeout",
            		"sWidth": "10%",
            		"bVisible":true,
            		"bSearchable":true,
            		"mRender": function(val,type,data) {
            			return isNaN(val) || val < 0 ? "" : val;
            		}
        		},
        		{
        			"sTitle":"Emails",
            		"mData": "email",
            		"sWidth": "20%",
            		"bVisible":true,
            		"bSearchable":true,
        		},
        		{
        			"sTitle":"Status",
            		"mData": "lastAlertTime",
            		"sWidth": "23%",
            		"bVisible":true,
            		"bSearchable":true,
            		"mRender": function(val, type, data) {
            			return val < 0 ? "Clear" : "Triggered at " + util.convertToDateTimeText(val);
            		}
        		},         		
				];
    			DataTable.View.prototype.initialize.apply(this,[{
    				columns:columns,
        			filterTemplate:alertFilterTemplate,
        			selectableTemplate:alertSelectableTemplate,
        			heightBuffer:80,        	
        			id:this.id,
        			emptyMessage:" ",
        			idAttribute:"alertId"
    			}]);				
			},
			render:function(){
            	DataTable.View.prototype.render.apply(this,[]);
            	this.views.selectable.find("#deleteAlertButton").on("click",this.handleDeleteButtonClick);
            	return this;
        	},
        	handleDeleteButtonClick:function(event){
            	var ids=this.getSelectedIds();
            	_.each(ids,function(id){
                	var model = app.alertCollection.get(id);
                	if(!_.isUndefined(model)){
                		model.delete().done(function(){
                    		app.alertCollection.remove(model.id);
                		}).fail(function(xhr){
                    		Alertify.log.error("Error deleting alert: "+model.id);
                    	});
                	}
            	});
            	Alertify.log.success(ids.length+" alerts deleted.");
            	app.router.navigate("#alerts",{trigger:true});
        	},
    	});
    	var DetailView = Backbone.View.extend({
    		className:'detail-view',
    		template: _.template(alertDetailTemplate),
        	events: {
            	"click #deleteAlertButton":"handleDeleteButtonClick",
        		"click #saveAlertButton":"handleSaveButtonClick",
        		"keyup input":"handleInputKeyUp",
        		"keyup textarea":"handleTextAreaKeyUp"
        	},
        	initialize:function(){},
        	render:function(){
         		var html = this.template({
            		alert:this.model.toJSON(),
            		alertTypes:util.alertTypes
         		});
        		this.$el.html(html);
        		$("#alertType").val(this.model.get("type"));
        		$("#alertType").on("change",this.updateFormOptions);
        		this.updateFormOptions();
         		return this;
        	},
        	handleDeleteButtonClick:function(event){
          		var self=this;
          		this.model.delete().done(function(data){
            		Alertify.log.success("Alert deleted successfully.");
               		app.router.navigate("#alerts",{trigger:true});
        		}).fail(function(xhr){
            		Alertify.log.error("Error deleting alert.");
        		});
        	},
        	handleSaveButtonClick:function(event){
            	var self=this,isNew=this.model.isNew();
            	this.model.save().done(function(data){
             		Alertify.log.success("Alert saved successfully.");
             		if (self.model.get("alertId") == "(no id)") {
             			self.model.set("alertId", data.alertId);
             			self.model.fetch({
             				success: function(model) {
             					app.alertsCollection.add(model);
             					app.alert=undefined;
             					var location = window.location.hash;
             					location=location.replace("create",data.alertId);
             					app.router.navigate(location,{trigger:true});
             				
             				},
             				error:function(xhr) {
             					Alertify.log.error("Error loading alert for: " + data.alertId);
             				}
             			});
             		}
            	}).fail(function(xhr){
            		Alertify.log.error("Error saving alert: "+self.model.id);
            	});
        	},
        	handleInputKeyUp:function(event){
        		var input=$(event.currentTarget);
        		var name = input.attr("name");
        		var value = input.val();
        		this.model.set(name,value);
        	},
        	handleTextAreaKeyUp:function(event){
        		var txt=$(event.currentTarget);
        		var name = txt.attr("name");
        		var value = txt.val();
        		var jobs = [];
        		_.each(value.split(','),function(job){
            		var trimmed = $.trim(job);
               		if(!_.isEmpty(trimmed)){
                   		jobs.push(trimmed);
               		}
        		});
        		this.model.set(name,jobs);
        	},
        	updateFormOptions:function() {
        		var type = parseInt($("#alertType").val());
        		// Alert type 0 and 1 do not use the timeout field
        		$("#alertTimeout").toggle(type >= 2);
        	}        	
    	});    
    	return {
    		Model:Model,
    		Collection: Collection,
    		TableView: TableView,
    		DetailView: DetailView
    	};
	});