<?php
$hostname = 'localhost';
$username = 'root';
$password = '';
$database = 'accounts';
$port = 3306;
$socket = NULL;
$connect = mysqli_connect($hostname, $username, $password, $database);

if(!$connect)
    {
        die("Connect failed : " . mysqli_connect_error());
    }
else
    {
        mysqli_set_charset($connect, 'utf8');
    }
?>  