FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Tạo thư mục uploads nếu chưa tồn tại
RUN mkdir -p uploads

EXPOSE 5000

CMD ["npm", "run", "dev"] 