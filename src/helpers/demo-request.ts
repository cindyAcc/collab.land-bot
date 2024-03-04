import axios from "axios";
import { currentUrl } from "./env";

const apiUrl = `${currentUrl}/gateway/request`;

export class DemoRequest {
  async request(param: string) {
    console.log(new Date(), "execute demo request", param);
    const options = {
      method: "get",
      headers: {
        appCode: process.env.APP_CODE || "xxxx",
        apiKey: process.env.API_KEY || "xxxx",
      },
      url: apiUrl + `/${param}`,
    };
    try {
      const response = await axios(options);
      console.log(new Date(), "response", response?.data, param);
      if (response?.data?.code === 200 && response?.data?.data !== null) {
        return response?.data?.data;
      } else {
        return "Timed out, please try again later.";
      }
    } catch (error) {
      console.error(error);
      return "server is busy now, please retry later.";
    }
  }
}
