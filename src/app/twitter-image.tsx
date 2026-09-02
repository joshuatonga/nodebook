import { createSocialImage, socialImageAlt, socialImageSize } from "./_social-image";

export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = "image/png";

export default function TwitterImage() {
  return createSocialImage();
}
