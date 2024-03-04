
//根据环境变量判断当前url输出
export const currentUrl = `https://${process.env.NODE_ENV === "production" ? "prod.sober.com" : "stage.sober.com"}`

