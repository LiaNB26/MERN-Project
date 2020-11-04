import React from "react";
import UsersList from "../components/UsersList";

const Users = () => {
  const USERS = [
    {
      id: "u1",
      name: "Lia B",
      image:
        "https://lh3.googleusercontent.com/proxy/mUT5iThmXFS9X9RggWMPfiKSnIvYViXMzO5QFtqY1V2aNl_dekB9Q_053bvKHYh-w7Y7FUcyrc66CYeLflemN_prGg",
      places: 3,
    },
  ];

  return <UsersList items={USERS} />;
};

export default Users;
