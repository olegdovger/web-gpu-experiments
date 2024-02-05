import {Layout} from "../LayoutManager/types.ts";

const layout: Layout = {
  type: "vertical",
  position: "top",
  blocks: [
    {
      width: "full",
      height: 50,

      layout: {
        type: "horizontal",
        position: "left",
        blocks: [
          {
            height: "full",
            width: 50,
          },
          {
            height: "full",
            width: 150,
          },
          {
            height: "full",
            width: 50,
          }
        ]
      }
    }
  ],
};

export default layout;