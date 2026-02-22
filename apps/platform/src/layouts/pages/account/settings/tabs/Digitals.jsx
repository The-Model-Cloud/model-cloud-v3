import ImageUploader from "components/ImageUploader";

function Digitals() {
  return (
    <ImageUploader
      fieldName="digitalImages"
      title="Digitals Upload"
      subtitle="Upload your digitals/polaroids - natural photos with minimal makeup in simple clothing (usually underwear or basics). These help clients see your natural features and proportions for castings."
      maxFiles={15}
    />
  );
}

export default Digitals;