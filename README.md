# Lumen Price Arena

全新版本的 LumenPenaltyContest 已升级为 **加密资产价格区间预测赛**，完整融合 fhEVM 0.9.1 的自助公开解密流程：

- **无管理员、周期自动**：部署构造函数立即创建第 1 轮，固定 7 天周期（其中前 4 天参赛，后 3 天等待结算），结算时自动 `_createNextContest` 开启下一轮；无人中奖时奖池自动滚存。
- **隐私下注**：玩家把预测方向（Up=1 / Down=0）通过 fhEVM SDK 加密后提交，链上仅存密文，锁定前无法被窥探。
- **自助公开解密**：锁定后任何人可 `requestRangeReveal`，合约遍历每个参赛者的方向密文调用 `makePubliclyDecryptable`，Relayer/玩家再通过 `submitRangeReveal` 把解密结果写回链上。
- **预言机价格裁决**：`settleContest` 通过 Chainlink Aggregator 获取目标资产最新价格，计算和开局价的涨跌幅（以 bps 表示），落入哪个区间，命中区间的玩家平分奖金；若该区间无人或曝光未准备好，则直接 `rolledOver`。
- **领奖机制**：`claimPrize` 支持多赢家平均分配，最后一名领取者获得尾差，确保奖池发放完毕。
- **查询接口**：`getContest`、`getRangeBounds`、`getRangeStats`、`getPlayerStatus`、`getPendingRevealHandles` 等 view 函数供前端展示倒计时、区间统计与个人参赛状态。

前端集成要点：
1. `.env` 中配置 `VITE_LUMEN_PRICE_ARENA_ADDRESS`，并在 wagmi ABI 中使用 `enterContest(externalEuint8 direction, bytes proof)`、`requestRangeReveal`、`submitRangeReveal`、`settleContest`、`claimPrize` 等方法签名。
2. 前端提交方向前需调用 fhEVM SDK（`encryptDirection`）生成密文与证明，之后才能调用 `enterContest`。
3. 显示 “方向公开” 状态（待请求 -> 待提交 -> 可结算），并提供按钮触发 `requestRangeReveal`、`submitRangeReveal`。
4. 结算后展示实际涨跌幅、中奖区间以及滚存情况，并允许赢家 `claimPrize`。

该玩法适合预测 BTC/ETH 等主流资产的短周期行情，结合 fhEVM 隐私下注，为链上用户提供更公平的预测体验。
