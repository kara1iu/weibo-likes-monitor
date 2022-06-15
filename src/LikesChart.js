import React, { useReducer, useState } from "react";
import { Tabs, Popconfirm, Button, Badge } from "antd";
import { Line } from "@ant-design/charts";
import axios from "axios";
import moment from "moment";

import { herokuLink } from "./constants";

const fetchLikeData = async (userId, callback) => {
  const weiboDetailUrl = `https://m.weibo.cn/api/container/getIndex?type=uid&value=${userId}&containerid=107603${userId}`;
  const response = await axios.get(herokuLink + weiboDetailUrl);
  if (response?.data?.ok === 1) {
    const newData = formatLikeData(response.data.data.cards);
    callback({
      type: "success",
      userId,
      userData: newData,
    });
  } else {
    callback({
      type: "fail",
      userId,
    });
  }
};

function formatLikeData(orgData = []) {
  return orgData
    .filter(({ card_type }) => card_type === 9)
    .map(({ itemid, mblog = {} }) => ({
      itemid,
      time: moment().valueOf(),
      likeCount: mblog.attitudes_count || 0,
      content: mblog.text,
    }));
}

function dataConcat(newData = [], prevUserData = [], dataLength = 500) {
  if (prevUserData.length >= dataLength) {
    return [
      ...prevUserData.slice(newData.length, prevUserData.length),
      ...newData,
    ];
  } else {
    return [...prevUserData, ...newData];
  }
}

function dataNormalization(data = [], normalizeOn = true) {
  const getUniq = (value, index, self) => {
    return self.indexOf(value) === index;
  };
  const dataArr = data
    .slice(0, 50)
    .map(({ itemid }) => itemid)
    .filter(getUniq);
  const dataRefArr = dataArr.map((id, index) => {
    const dataRef = data.find(({ itemid }) => itemid === id);
    return { ...dataRef, weiboIndex: index + 1 };
  });
  return data.map((e) => {
    const findRef = dataRefArr.find(({ itemid }) => itemid === e.itemid);
    return {
      ...e,
      weiboIndex: "第" + findRef.weiboIndex + "条微博",
      likeCount: e.likeCount - (normalizeOn ? findRef.likeCount : 0),
    };
  });
}

export function LikesChart({ activeMode, watchUserList, removeUser }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const onClickMonitor = () => {
    let step = 0;
    while (step <= 50) {
      setTimeout(
        () =>
          watchUserList.map(({ userId }) => fetchLikeData(userId, dispatch)),
        step * 2000
      );
      step++;
    }
  };
  const onClickReset = () => {
    dispatch({
      type: "reset",
    });
  };
  return (
    <>
      <Button
        disabled={!watchUserList.length || state.isInProcessing}
        onClick={onClickMonitor}
        style={{ marginRight: 10, marginBottom: 10 }}
      >
        <Badge
          status={state.isInProcessing ? "processing" : "default"}
          text={state.isInProcessing ? "Monitoring" : "Start Monitor"}
        />
      </Button>
      <Button
        disabled={Object.keys(state).length === 1}
        onClick={onClickReset}
        style={{ marginRight: 10, marginBottom: 10 }}
      >
        Reset Data
      </Button>
      <SingleUserCharts
        activeMode={activeMode}
        watchUserList={watchUserList}
        removeUser={removeUser}
        state={state}
      />
    </>
  );
}

function SingleUserCharts({
  watchUserList = [],
  removeUser,
  state = {},
  activeMode,
}) {
  const [activeUser, setActiveUser] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState({});
  // const [normalizeOn, setNormalizeOn] = useState(true);
  const chartData = state[activeUser || ""] || [];
  const config = {
    meta: {
      x: { sync: true },
      y: { sync: true },
      likeCount: {
        nice: true,
      },
      time: {
        formatter: (e) => {
          return moment(e).utcOffset(8).format("HH:mm:ss");
        },
        nice: true,
      },
    },
    data: dataNormalization(chartData, true),
    xField: "time",
    yField: "likeCount",
    seriesField: "weiboIndex",
  };
  if (activeMode === "1" && watchUserList.length) {
    return (
      <>
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={activeUser}
          onChange={(key) => setActiveUser(key)}
          onEdit={(key, mode) => {
            setRemoveConfirm({ [key]: true });
          }}
        >
          {watchUserList.map(({ userName, userId }) => (
            <Tabs.TabPane
              tab={
                <Popconfirm
                  disabled={true}
                  placement="bottomLeft"
                  title={`Do you want to remove ${userName} from watch list?`}
                  visible={removeConfirm[userId]}
                  onConfirm={() => {
                    setRemoveConfirm({});
                    removeUser(userId);
                  }}
                  onCancel={() => {
                    setRemoveConfirm({});
                  }}
                  okText="Yes"
                  cancelText="Cancel"
                >
                  {userName}
                </Popconfirm>
              }
              key={userId}
              closable={true}
            ></Tabs.TabPane>
          ))}
        </Tabs>
        <Line {...config} />
      </>
    );
  }
  return null;
}

const initialState = {
  isError: {},
  isInProcessing: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "success": {
      const prevUserData = state[action.userId] || [];
      const validDataCheck = () => {
        return (action.userData || []).every((data) => {
          const ref =
            prevUserData.find(({ itemid }) => itemid === data.itemid) || {};
          return (data.likeCount || 0) + 100 > (ref.likeCount || 0);
        });
      };
      if (validDataCheck()) {
        return {
          ...state,
          isInProcessing: prevUserData.length < 490,
          [action.userId]: dataConcat(action.userData, prevUserData),
          isError: {
            ...state.isError,
            [action.userId]: false,
          },
        };
      } else {
        return state;
      }
    }
    case "fail":
      return {
        ...state,
        isError: {
          ...state.isError,
          [action.userId]: true,
        },
      };
    case "reset": {
      return initialState;
    }
    default:
      throw new Error();
  }
}
