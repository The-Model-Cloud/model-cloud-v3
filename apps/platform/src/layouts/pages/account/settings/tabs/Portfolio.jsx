import ImageUploader from "components/ImageUploader";

function Portfolio() {
  return (
    <ImageUploader
      fieldName="portfolioImages"
      title="Portfolio Upload"
      subtitle="Upload your professional fashion shots - editorial, commercial, beauty, and runway images. These photos showcase your modeling work and style range."
      maxFiles={30}
    />
  );
}

export default Portfolio;