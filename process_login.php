<?php
$open_connect = 1;
require('connect.php');
if(isset($_POST['email_account']) && ($_POST['password_account']))
    {
        $email_account = htmlspecialchars(mysqli_real_escape_string($connect,$_POST['email_account']));
        $password_account = htmlspecialchars(mysqli_real_escape_string($connect,$_POST['password_account']));
        $query_check_account = "SELECT * FROM account WHERE email_account = '$email_account'";
        $call_back_check_account = mysqli_query($connect,$query_check_account);
        if(mysqli_num_rows($call_back_check_account)==1)
            {
                $resault_check_account = mysqli_fetch_assoc($call_back_check_account);
                $hash = $resault_check_account['password_account'];
                $password_account = $password_account . $resault_check_account['salt_account'];

                if(password_verify($password_account,$hash))
                    {
                        if($resault_check_account['role_account']=='member')
                            {
                                die(header('Location: main_page.php'));
                            }
                        elseif($resault_check_account['role_account']=='admin')
                            {
                                die(header('Location: admin_page.php'));
                            }
                    }
                else//รหัสผ่านไม่ถูกต้อง
                    {
                        die(header('Location: login_register_page.php?error=wrong_password#login'));
                        exit();
                    }
            }
    }
else
    {
        die(header('Location: login_register_page.php'));
    }

?>