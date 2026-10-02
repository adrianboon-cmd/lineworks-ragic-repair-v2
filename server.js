const ragic = require("./src/ragic");
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "lineworks-ragic-repair-v2"
  });
});

app.get("/", (req, res) => {
  res.send("LINE WORKS Ragic Repair V2 Running");
});

app.get("/app", (req, res) => {
  res.sendFile(
    path.join(__dirname , "public" , "index.html")
  );
});

const PORT = process.env.PORT || 3000;
app.post("/api/repairs", async (req, res) => {

  try {

    const result =
      await ragic.createRepair(req.body);

    res.json({
      success: true,
      result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});
app.get(
  "/api/repairs/:ticketNumber",
  async (req, res) => {

    try {

      const record =
        await ragic.findRepair(
          req.params.ticketNumber
        );

      if (!record) {

        return res.status(404).json({
          success:false,
          message:"找不到案件"
        });

      }

      res.json({
        success:true,
        record
      });

    } catch(error) {

      console.error(error);

      res.status(500).json({
        success:false,
        message:error.message
      });

    }

  }
);

app.listen(PORT , () => {
  console.log(`Server running on ${PORT}`);
});
