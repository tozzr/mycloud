$(document).ready(function(){
	$('#loginLink').click(function() {
		$('#loginDialog').dialog('open');
	});
	$('#loginForm input').keydown(function(event){
		if ( event.which == 13 ) {
			login();
		}
	});
	$('#loginDialog').dialog({ autoOpen: false, modal: true,
		buttons: [
			{
			text: "Log in",
			click: login
			}
		]
	});
	
	$('#createDir').click(function(){
		$('#newDirDialog').dialog('open');
	});
	$('#newDirDialog').dialog({ autoOpen: false, modal: true,
		buttons: [
			{
			text: "Ok",
			click: createDir
			}
		]
	});
	$('#newDirName').keydown(function(event){
		if ( event.which == 13 ) {
			createDir();
		}
	});
	
	var ajaxUpload = new AjaxUpload('newFile', {
		action: '/file',
		name: 'uploadfile',
		multiple: true,
		onSubmit : function(file, ext){
			ajaxUpload._settings['action'] = '/file' + $('#dirpath').text();
		},
		onComplete: function(file, response){
			reload();
		}
	});
	
	$('.rename').live('click', function(){
		$('#rename_target').val( $(this).attr('rel') );
		$('#rename').val( $(this).parent().children('a:first-child').text() );
		$('#renameDialog').dialog('open');
		$('#rename').focus();
		$('#rename').select();
	});
	$('#renameDialog').dialog({ autoOpen: false, modal: true,
		buttons: [
			{
			text: "rename",
			click: renameEntry
			}
		]
	});
	$('#rename').keydown(function(event){
		if ( event.which == 13 ) {
			renameEntry();
		}
	});
	
	$('.delete').live('click', function(){
		$.post($(this).attr('rel'), $('#deleteItemForm').serialize(), function(result) {
			reload();
		});
	});
	
});

var login = function () {
	$.post('/login', $('#loginForm').serialize(), function (result) {
		if (result.status == 'ok') {
			$('#loginErrors').hide();
			$(this).dialog("close");
			document.cookie='connect.sid='+result.sid;
			document.location.href = '/dir';
		}
		else {
			$('#loginErrors').fadeIn();
		}
	});
};

var createDir = function () {
	if ($('#newDirName').val() != '')
		$.post($('#new_target').val(), $('#newDirForm').serialize(), function(result) {
			if (result == 'ok')
				reload();
			else
				alert('something went wrong');
		});
};

var renameEntry = function () {
	if ($('#newName').val() != '')
		$.post($('#rename_target').val(), $('#renameForm').serialize(), function(result) {
			if (result == 'ok')
				reload();
			else
				alert('something went wrong');
		});
};


var reload = function() { document.location.href = currentPath(); }
var currentPath = function () { return '/dir' + $('#dirpath').text(); }
