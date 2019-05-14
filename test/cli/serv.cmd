@SETLOCAL
@SET PATHEXT=%PATHEXT:;.JS;=;%
node "%~dp0\..\..\bin\serv.js" %*
