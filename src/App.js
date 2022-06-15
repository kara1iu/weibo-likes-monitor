import React, { useReducer, useState } from "react";
import { PageHeader, Tabs } from "antd";
import moment from "moment";

import { UserSearchList } from "./UserSearchList";
import { LikesChart } from "./LikesChart";

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { watchUserList = [] } = state;
  const [activeMode, setActiveMode] = useState("1");
  return (
    <div className="App">
      <PageHeader
        title="Weibo Likes Monitor"
        subTitle={
          "Watch any user's weibo likes increment in chart  -  " +
          moment().utc().utcOffset(8).format("YYYY[年]MM[月]DD[日]")
        }
        extra={[
          <UserSearchList
            key="1"
            userList={watchUserList.map(({ userId }) => userId)}
            onAddUser={(userList) =>
              dispatch({
                type: "addUser",
                userList,
              })
            }
          />,
        ]}
      >
        <Tabs defaultActiveKey="1" onChange={(key) => setActiveMode(key)}>
          <Tabs.TabPane tab="Watch one user" key="1"></Tabs.TabPane>
          <Tabs.TabPane
            disabled
            tab="Compare across added users"
            key="2"
          ></Tabs.TabPane>
        </Tabs>
        <LikesChart
          activeMode={activeMode}
          watchUserList={watchUserList}
          removeUser={(userId) => dispatch({ type: "removeUser", userId })}
        />
      </PageHeader>
    </div>
  );
}

export default App;

const initialState = {
  watchUserList: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "addUser":
      return {
        ...state,
        watchUserList: [...state.watchUserList, ...action.userList],
      };
    case "removeUser":
      return {
        ...state,
        watchUserList: state.watchUserList.filter(
          ({ userId }) => userId !== action.userId
        ),
      };
    default:
      throw new Error();
  }
}
