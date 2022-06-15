import React, { useReducer, useState } from "react";
import axios from "axios";
import {
  Input,
  Skeleton,
  Alert,
  Avatar,
  Col,
  Row,
  Card,
  Button,
  Drawer,
  Checkbox,
  Tooltip,
} from "antd";

import { herokuLink } from "./constants";

const searchUser = async (userQuery, callback, userList) => {
  if (userQuery.length) {
    callback({
      type: "isLoading",
      isLoading: true,
    });
    const queryToEncode = `type=3&q=${userQuery}&t=0`;
    const searchUserUrl = `https://m.weibo.cn/api/container/getIndex?containerid=100103${encodeURIComponent(
      queryToEncode
    )}&page_type=searchall`;
    const response = await axios.get(herokuLink + searchUserUrl);
    callback({
      type: "isLoading",
      isLoading: false,
    });
    if (response?.data?.ok === 1) {
      callback({ type: "isSearchError", isSearchError: false });
      callback({
        type: "userSearchResult",
        userSearchResult: reformatUserSearchData(
          response.data.data.cards,
          userList
        ),
      });
    } else {
      callback({ type: "isSearchError", isSearchError: true });
      callback({
        type: "userSearchResult",
        userSearchResult: [],
      });
    }
  }
};

function reformatUserSearchData(orgData = [], orgUserList = []) {
  const { card_group } =
    orgData.find(({ card_type }) => card_type === 11) || {};
  const userList = card_group
    .filter(({ card_type }) => card_type === 10) // get type 10
    .map(({ user, desc1 }) => ({
      avatar: user.avatar_hd,
      userName: user.screen_name,
      userId: user.id,
      followerStr: user.followers_count_str,
      description: desc1,
      isInList: orgUserList.includes(user.id),
      isChecked: orgUserList.includes(user.id),
    }))
    .slice(0, 6);
  return userList;
}

function updateUserSearchData(orgData = [], userId, fieldTobeUpdate) {
  const updatedData = orgData.map((e) => {
    if (userId === e.userId) {
      const updateValue = !e[fieldTobeUpdate];
      return {
        ...e,
        [fieldTobeUpdate]: updateValue,
      };
    }
    return e;
  });
  return updatedData;
}

export function UserSearchList({ userList = [], onAddUser }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isLoading, isSearchError, userSearchResult = [] } = state;
  const [visible, setVisible] = useState(false);
  const getNewUsers = userSearchResult.filter(
    ({ isChecked, isInList }) => isChecked && !isInList
  );
  const onAddUsers = () => {
    onAddUser(getNewUsers);
    setVisible(false);
    dispatch({
      type: "addUser",
    });
  };
  return (
    <div className="UserSearchList">
      <Button onClick={() => setVisible(true)}>
        Start search and add user
      </Button>
      <Drawer
        width={600}
        title="Search Weibo User"
        placement="right"
        onClose={() => setVisible(false)}
        visible={visible}
      >
        <Input.Search
          onSearch={(userQuery) => searchUser(userQuery, dispatch, userList)}
          allowClear
          style={{ margin: 16, width: "50%" }}
          defaultValue="肖战"
        />
        <Skeleton style={{ margin: 16 }} loading={isLoading} active>
          {isSearchError ? (
            <Alert
              style={{ margin: 16 }}
              message="No result found. Please re-search with valid values."
              type="error"
              showIcon
            />
          ) : (
            <>
              <Button
                style={{ margin: 16 }}
                disabled={!getNewUsers.length}
                onClick={onAddUsers}
              >
                Add Selected Users
              </Button>
              <UserCardList
                userSearchResult={userSearchResult}
                dispatch={dispatch}
              />
            </>
          )}
        </Skeleton>
      </Drawer>
    </div>
  );
}

function UserCardList({ userSearchResult = [], dispatch }) {
  if (userSearchResult.length) {
    return (
      <Row>
        {userSearchResult.map(
          ({
            userId,
            userName,
            avatar,
            description,
            followerStr,
            isInList,
            isChecked,
          }) => (
            <Col span={12} key={userId}>
              <Tooltip placement="bottomLeft" title={description}>
                <Card
                  style={{
                    margin: 16,
                  }}
                >
                  <Card.Meta
                    avatar={<Avatar src={avatar} shape="square" />}
                    title={userName}
                    description={"followers:" + followerStr}
                  />
                  <Checkbox
                    onClick={() => dispatch({ type: "onClickCard", userId })}
                    disabled={isInList}
                    checked={isChecked}
                  />
                </Card>
              </Tooltip>
            </Col>
          )
        )}
      </Row>
    );
  }
  return null;
}

const initialState = {
  userSearchResult: [],
  isLoading: false,
  isSearchError: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "userSearchResult":
      return { ...state, userSearchResult: action.userSearchResult };
    case "isLoading":
      return { ...state, isLoading: action.isLoading };
    case "isSearchError":
      return { ...state, isSearchError: action.isSearchError };
    case "onClickCard":
      const userSearchResult = updateUserSearchData(
        state.userSearchResult,
        action.userId,
        "isChecked"
      );
      return { ...state, userSearchResult };
    case "addUser": {
      return initialState;
    }
    default:
      throw new Error();
  }
}
