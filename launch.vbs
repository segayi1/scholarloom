Option Explicit
Dim fs, shell, folder, python, address, request, running, i
Set fs = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fs.GetParentFolderName(WScript.ScriptFullName)
python = "pythonw.exe"
address = "http://127.0.0.1:8766"
running = False
For i = 0 To 30
  On Error Resume Next
  Set request = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  request.setTimeouts 500, 500, 500, 1000
  request.Open "GET", address & "/api/health", False
  request.Send
  If Err.Number = 0 Then
    If request.Status = 200 Then running = (InStr(request.responseText, "literature-workbench") > 0)
  End If
  Err.Clear
  On Error GoTo 0
  If running Then Exit For
  If i = 0 Then shell.Run """" & python & """ """ & folder & "\server.py""", 0, False
  WScript.Sleep 500
Next
If running Then
  If WScript.Arguments.Count = 0 Then shell.Run address, 1, False
Else
  If WScript.Arguments.Count = 0 Then MsgBox "The local workbench could not start. Check Python or port 8766.", 48, "Literature Workbench"
End If
