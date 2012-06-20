var dirpath = '';
var parentdir = '/';

$(document).ready(function(){	
	getDirEntries();
	
	$('a.parentdir').click(function() {
		dirpath = parentdir;
		getDirEntries();
	});
	$('a.dir').live('click', function() {
		dirpath = $(this).attr('rel');
		ajaxUpload._settings['action'] = '/files'+dirpath;
		getDirEntries();
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
			click: function() { 
					var dialog = $(this);
					$.post('/login', $('#loginForm').serialize(), function (result) {
						if (result.status == 'ok') {
							$(dialog).dialog("close");
							document.cookie='connect.sid='+result.sid;
							getDirEntries();
						}
					});
				}
			}
		]
	});
	$('#logout').click(function(){
		$.get('/logout', function() {
			$('#header').hide();
			$('#action').hide();
			$('#dirpath').hide();
			$('#fileTable tr.row').remove();
			$('#loginDialog').dialog('open');
		});
	});
	
	$('#newDirDialog').dialog({ autoOpen: false, modal: true,
		buttons: [
			{
			text: "Ok",
			click: function() { 
					var dialog = $(this);
					if ($('#newDirName').val() != '')
						$.post('/dir'+dirpath, $('#newDirForm').serialize(), function(result) {
							getDirEntries();
							$(dialog).dialog('close');
						}); 
				}
			}
		]
	});
	$('#createDir').click(function(){
		$('#newDirDialog').dialog('open');
	});
	$('.deleteDir').live('click', function(){
		$.post($(this).attr('rel'), $('#deleteItemForm').serialize(), function(result) {
			getDirEntries();
		});
	});
	
	var ajaxUpload = new AjaxUpload('newFile', {
		action: '/files'+dirpath,
		name: 'uploadfile',
		multiple: true,
		onSubmit : function(file, ext){
		},
		onComplete: function(file, response){
			getDirEntries();
		}
	});
	$('.deleteFile').live('click', function(){
		$.post($(this).attr('rel'), $('#deleteItemForm').serialize(), function(result) {
			getDirEntries();
		});
	});
	
});

var login = function () {
	var dialog = $('#loginDialog');
	$.post('/login', $('#loginForm').serialize(), function (result) {
		if (result.status == 'ok') {
			$(dialog).dialog("close");
			document.cookie='connect.sid='+result.sid;
			getDirEntries();
		}
	});
};

var getDirEntries = function() {
	$.getJSON('/files'+dirpath, function (result) {
		showDirEntries(result);
	}).error(function() {
		$('#loginDialog').dialog('open');
	});
};

var showDirEntries = function(data) {
	$('#header').show();
	$('#action').show();
	$('#dirpath').text( dirpath );
	if (dirpath == '') 
		$('tr.parent').hide();
	else
		$('tr.parent').show();
		
	parentdir = data['parentdir'];
	
	$('#fileTable tr.row').remove();
	var table = $('#fileTable');
	$(table).hide();
	
	for (i in data.dirs)
		$(table).append( directoryRow(data.dirs[i]) );
		
	for (i in data.files)
		$(table).append( fileRow(data.files[i]) );
	
	$(table).show();
};

var directoryRow = function (dirData) {
	var row = $('<tr></tr>').addClass('row')
	$(row).append( iconCell('folder') );
	var nameCell = $('<td></td>').append( 
		$('<a></a>').attr('href','javascript:;').attr('rel', dirData.path).addClass('dir').text( dirData.name )
	);
	$(row).append( nameCell );
	$(row).append( $('<td></td>').addClass('size') );
	var deleteCell = $('<td></td>');
	var deleteLink = $('<a></a>').attr('href','javascript:;')
	                             .attr('rel', '/dir'+dirData.path)
								 .addClass('deleteDir')
								 .text('x');
	$(deleteCell).append( deleteLink );
	$(row).append( deleteCell );
	return row;
};

var fileRow = function (fileData) {
	var row = $('<tr></tr>').addClass('row')
	$(row).append( iconCell( fileData.icon ) );
	var nameCell = $('<td></td>').append( $('<a></a>').attr('href','/files'+fileData.path).text( fileData.name ) );
	$(row).append( nameCell );
	$(row).append( $('<td></td>').addClass('size').text( fileData.size ) );
	var deleteCell = $('<td></td>');
	var deleteLink = $('<a></a>').attr('href','javascript:;')
	                             .attr('rel', '/files'+fileData.path)
								 .addClass('deleteFile')
								 .text('x');
	$(deleteCell).append( deleteLink );
	$(row).append( deleteCell );
	return row;
};

var iconCell = function(filename) {
	var iconCell = $('<td></td>').addClass('icon');
	var icon = $('<img/>').attr('src','/images/'+filename+'.png').attr('width',16).attr('height',16);
	$(iconCell).append( icon );
	return iconCell;
};