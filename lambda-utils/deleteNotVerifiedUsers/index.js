// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require("aws-sdk");
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

exports.handler = async event => {
  try {
    //get all users, which are not verified from user pool
    const notVerifiedCognitoUsers = await getAllNotVerifiedCognitoUsers();
    //filter users to check if the creation of the user was more than
    //24 hours agp
    const date = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const filteredUsers = notVerifiedCognitoUsers.filter(
      user => date - user.UserCreateDate > oneDay
    );
    console.log(
      "not verified and it has been a day count:",
      filteredUsers.length
    );

    //resend confirmation code
    for (let user of filteredUsers) {
      try {
        //     await resendConfirmationCode(user);
      } catch (error) {
        console.log("error resending code", error);
      }
    }
  } catch (error) {
    console.log("error", error);
  }
  return;
};

const getAllNotVerifiedCognitoUsers = async () => {
  let notVerifiedCognitoUsers = [];
  let data = await getNotVerifiedCognitoUsers(null);
  //add elements of user array
  notVerifiedCognitoUsers.push(...data.Users);
  while (data.PaginationToken) {
    data = await getNotVerifiedCognitoUsers(data.PaginationToken);
    //add elements of user array
    notVerifiedCognitoUsers.push(...data.Users);
  }
  return notVerifiedCognitoUsers;
};

const getNotVerifiedCognitoUsers = paginationToken => {
  const params = {
    UserPoolId: "eu-central-1_74vNy5Iw0",
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    PaginationToken: paginationToken
  };
  //get all users, which are not verified from user pool
  return CognitoIdentityServiceProvider.listUsers(params).promise();
};

const resendConfirmationCode = user => {
  const params = {
    ClientId: "ci822dda02qdhkju7mnd3kh8v",
    Username: user.Username
  };
  return CognitoIdentityServiceProvider.resendConfirmationCode(
    params
  ).promise();
};
